import { Elysia, t } from 'elysia'
import { AppDataSource } from '../db/data-source'
import { MessageEmbeddingRepository } from '../db/repositories'

export const embeddingRoutes = new Elysia({ prefix: '/embeddings' })
  .post(
    '/sync',
    async ({ body }) => {
      if (!Array.isArray(body.items) || body.items.length === 0) return { synced: 0 }

      const manager = MessageEmbeddingRepository.manager

      // Deduplicate input by messageId (keep last occurrence)
      const dedupMap = new Map<string, number[]>()
      for (const item of body.items) {
        dedupMap.set(item.messageId, item.embedding)
      }
      const deduped = Array.from(dedupMap.entries()).map(([messageId, embedding]) => ({
        messageId,
        embedding,
      }))

      const values = deduped.map((_, idx) => {
        const vStart = idx * 2 + 1
        return `($${vStart}::uuid, $${vStart + 1}::vector)`
      })
      const flatParams: (string | number[])[] = deduped.flatMap((item) => [
        item.messageId,
        `[${item.embedding.join(',')}]`,
      ])

      await manager.query(
        `INSERT INTO message_embeddings (message_id, embedding) VALUES ${values.join(', ')}
         ON CONFLICT (message_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        flatParams,
      )

      return { synced: deduped.length }
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            messageId: t.String(),
            embedding: t.Array(t.Number()),
          }),
        ),
      }),
    },
  )
  .post(
    '/suggestions',
    async ({ body }) => {
      const embedding = body.embedding;
      const excludeIds = body.excludeMessageIds ?? [];
      const safeLimit = Math.min(Number(body.limit ?? 3), 5);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        return [];
      }

      const vectorStr = `[${embedding.join(',')}]`;

      const safeExclude = excludeIds.length > 0
        ? `('${excludeIds.map((id: string) => id.replace(/'/g, "''")).join("','")}')`
        : `('{00000000-0000-0000-0000-000000000000}')`;

      const manager = MessageEmbeddingRepository.manager;
      const results = await manager.query(
        `
      SELECT DISTINCT ON (m.content) m.id, m.content, me.embedding <=> $1::vector AS similarity
      FROM message_embeddings me
      INNER JOIN messages m ON me.message_id = m.id
      WHERE m.id NOT IN ${safeExclude}
      ORDER BY m.content, similarity ASC
      LIMIT ${safeLimit}
    `,
        [vectorStr],
      );

      return results.map((r: any) => ({
        content: r.content,
        similarity: r.similarity,
      }));
    },
    {
      body: t.Object({
        embedding: t.Array(t.Number()),
        excludeMessageIds: t.Optional(t.Array(t.String())),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .post(
    '/search',
    async ({ body }) => {
      const { query, limit = 10, conversationId } = body;

      if (!query || query.trim().length === 0) {
        return { results: [], total: 0 };
      }

      // Full-text search across all message content
      // If conversationId is provided, scope to that conversation
      const params: (string | number)[] = [`%${query}%`];
      const safeLimit = Math.min(Number(limit), 100);

      const convFilter = conversationId ? 'AND m.conversation_id = $2' : '';

      const rows = await AppDataSource.query(
        `
        SELECT m.id, m.content, m.role, m.model_name,
               m.conversation_id, c.title AS conversation_title,
               m.created_at
        FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE m.content ILIKE $1 ${convFilter}
          AND m.role IN ('user', 'assistant')
        ORDER BY m.created_at DESC
        LIMIT ${safeLimit}
      `,
        params,
      );

      return {
        results: rows.map((r: any) => ({
          id: r.id,
          content: r.content,
          role: r.role,
          modelName: r.model_name,
          conversationId: r.conversation_id,
          conversationTitle: r.conversation_title,
          createdAt: new Date(r.created_at).toISOString(),
        })),
        total: rows.length,
      };
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1, maxLength: 500 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        conversationId: t.Optional(t.String({ format: 'uuid' })),
      }),
    },
  );

import { Elysia, t } from 'elysia'
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
      const convId = body.conversationId;
      const embedding = body.embedding;
      const excludeIds = body.excludeMessageIds ?? [];
      const limit = body.limit ?? 5;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        return [];
      }

      const vectorStr = `[${embedding.join(',')}]`;

      if (excludeIds.length === 0) {
        excludeIds.push('00000000-0000-0000-0000-000000000000');
      }

      const manager = MessageEmbeddingRepository.manager;
      const results = await manager.query(
        `
      SELECT m.id, m.content, me.embedding <=> $1::vector AS similarity
      FROM message_embeddings me
      INNER JOIN messages m ON me.message_id = m.id
      WHERE m.conversation_id = $2
        AND m.role = 'user'
        AND m.id != ALL($3::uuid[])
      ORDER BY similarity ASC
      LIMIT $4
    `,
        [vectorStr, convId, excludeIds, limit],
      );

      return results.map((r: any) => ({
        content: r.content,
        similarity: r.similarity,
      }));
    },
    {
      body: t.Object({
        conversationId: t.String(),
        embedding: t.Array(t.Number()),
        excludeMessageIds: t.Optional(t.Array(t.String())),
        limit: t.Optional(t.Number()),
      }),
    },
  );

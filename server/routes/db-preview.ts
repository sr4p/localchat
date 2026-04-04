import { Elysia, t } from 'elysia';
import { AppDataSource } from '../db/data-source';

const conversationIdParam = t.Object({
  conversationId: t.String({ format: 'uuid' }),
});

export const dbPreviewRoutes = new Elysia({ prefix: '/db-preview' })
  .get('/stats', async () => {
    const raw = await AppDataSource.query(`
      SELECT
        (SELECT COUNT(*)::int FROM conversations) AS "conversationCount",
        (SELECT COUNT(*)::int FROM messages) AS "messageCount"
    `);

    const modelRaw = await AppDataSource.query(`
      SELECT model_name, COUNT(*)::int AS count
      FROM messages
      WHERE model_name IS NOT NULL
      GROUP BY model_name
    `);

    const usageByModel: Record<string, number> = {};
    for (const row of modelRaw) {
      usageByModel[row.model_name as string] = Number(row.count);
    }

    const recentRaw = await AppDataSource.query(`
      SELECT id, role, content, model_name, created_at
      FROM messages
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return {
      conversationCount: Number(raw[0].conversationCount),
      messageCount: Number(raw[0].messageCount),
      usageByModel,
      recentMessages: recentRaw.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content.slice(0, 120),
        modelName: m.model_name ?? 'unknown',
        createdAt: new Date(m.created_at).toISOString(),
      })),
    };
  })
  .get('/conversations', async () => {
    const results = await AppDataSource.query(`
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        COUNT(m.id)::int AS "messageCount"
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `);

    return results.map((r: any) => ({
      id: r.id,
      title: r.title,
      messageCount: r.messageCount,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  })
  .get('/messages/:conversationId', async ({ params }) => {
    const messages = await AppDataSource.query(
      `
      SELECT id, role, content, reasoning, duration_sec, token_count, model_name, model_type, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `,
      [params.conversationId],
    );

    return messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
      durationSec: m.duration_sec,
      tokenCount: m.token_count,
      modelName: m.model_name,
      modelType: m.model_type,
      createdAt: new Date(m.created_at).toISOString(),
    }));
  }, { params: conversationIdParam });

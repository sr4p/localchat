import { Elysia, t } from 'elysia';
import { AppDataSource } from '../db/data-source';

const idParam = t.Object({ id: t.String({ format: 'uuid' }) });

export const conversationRoutes = new Elysia({ prefix: '/conversations' })
  .get('/', async () => {
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
  .post(
    '/',
    async ({ body }) => {
      const result = await AppDataSource.query(
        `INSERT INTO conversations (title) VALUES ($1) RETURNING id, title, created_at, updated_at`,
        [body?.title ?? 'Untitled Conversation'],
      );

      const row = result[0];
      return {
        id: row.id,
        title: row.title,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
      }),
    },
  )
  .get('/:id', async ({ params }) => {
    const conversation = await AppDataSource.query(
      `
      SELECT
        c.id AS conversation_id,
        c.title AS conversation_title,
        c.created_at,
        c.updated_at,
        m.id AS message_id,
        m.role,
        m.content,
        m.reasoning,
        m.duration_sec,
        m.token_count,
        m.model_name,
        m.model_type,
        m.parent_id,
        m.created_at AS message_created_at
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.id = $1
      ORDER BY m.created_at ASC
    `,
      [params.id],
    );

    if (conversation.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    const firstRow = conversation[0];
    const messages = conversation
      .filter((r: any) => r.message_id)
      .map((r: any) => ({
        id: r.message_id,
        role: r.role,
        content: r.content,
        reasoning: r.reasoning,
        durationSec: r.duration_sec,
        tokenCount: r.token_count,
        modelName: r.model_name,
        modelType: r.model_type,
        parentId: r.parent_id,
        createdAt: new Date(r.message_created_at).toISOString(),
      }));

    return {
      id: firstRow.conversation_id,
      title: firstRow.conversation_title,
      createdAt: new Date(firstRow.created_at).toISOString(),
      updatedAt: new Date(firstRow.updated_at).toISOString(),
      messages,
    };
  }, { params: idParam })
  .delete('/:id', async ({ params }) => {
    const result = await AppDataSource.query(
      `DELETE FROM conversations WHERE id = $1`,
      [params.id],
    );
    if (result.affected === 0) return new Response('Not found', { status: 404 });
    return new Response(null, { status: 204 });
  }, { params: idParam })
  .patch(
    '/:id',
    async ({ params, body }) => {
      const result = await AppDataSource.query(
        `UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, created_at, updated_at`,
        [body.title, params.id],
      );
      if (result.length === 0) return new Response('Not found', { status: 404 });
      const row = result[0];
      return {
        id: row.id,
        title: row.title,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    },
    {
      body: t.Object({
        title: t.String(),
      }),
      params: idParam,
    },
  );

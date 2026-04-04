import { Elysia, t } from 'elysia';
import { AppDataSource } from '../db/data-source';

const idParam = t.Object({ id: t.String({ format: 'uuid' }) });

export const messageRoutes = new Elysia({ prefix: '/messages' })
  .post(
    '/',
    async ({ body }) => {
      const result = await AppDataSource.query(
        `
        INSERT INTO messages
          (conversation_id, role, content, reasoning, duration_sec, token_count, model_name, model_type, parent_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, role, content, reasoning, duration_sec, token_count, model_name, model_type, parent_id, created_at
      `,
        [
          body.conversationId,
          body.role,
          body.content,
          body.reasoning ?? null,
          body.durationSec ?? null,
          body.tokenCount ?? null,
          body.modelName ?? null,
          body.modelType ?? null,
          body.parentId ?? null,
        ],
      );

      const row = result[0];
      return {
        id: row.id,
        role: row.role,
        content: row.content,
        reasoning: row.reasoning,
        durationSec: row.duration_sec,
        tokenCount: row.token_count,
        modelName: row.model_name,
        modelType: row.model_type,
        parentId: row.parent_id,
        createdAt: new Date(row.created_at).toISOString(),
      };
    },
    {
      body: t.Object({
        conversationId: t.String(),
        role: t.Union([t.Literal('user'), t.Literal('assistant'), t.Literal('system')]),
        content: t.String(),
        reasoning: t.Optional(t.Nullable(t.String())),
        durationSec: t.Optional(t.Nullable(t.Number())),
        tokenCount: t.Optional(t.Nullable(t.Number())),
        modelName: t.Optional(t.Nullable(t.String())),
        modelType: t.Optional(t.Nullable(t.Union([t.Literal('local'), t.Literal('api')]))),
        parentId: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .put(
    '/:id',
    async ({ params, body }) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (body.content !== undefined) {
        updates.push(`content = $${idx++}`);
        values.push(body.content);
      }
      if (body.reasoning !== undefined) {
        updates.push(`reasoning = $${idx++}`);
        values.push(body.reasoning);
      }
      if (body.durationSec !== undefined) {
        updates.push(`duration_sec = $${idx++}`);
        values.push(body.durationSec);
      }
      if (body.tokenCount !== undefined) {
        updates.push(`token_count = $${idx++}`);
        values.push(body.tokenCount);
      }
      if (body.modelName !== undefined) {
        updates.push(`model_name = $${idx++}`);
        values.push(body.modelName);
      }
      if (body.modelType !== undefined) {
        updates.push(`model_type = $${idx++}`);
        values.push(body.modelType);
      }
      if (body.parentId !== undefined) {
        updates.push(`parent_id = $${idx++}`);
        values.push(body.parentId);
      }

      if (updates.length === 0) {
        const row = await AppDataSource.query(
          `SELECT id, role, content, reasoning, duration_sec, token_count, model_name, model_type, parent_id, created_at FROM messages WHERE id = $1`,
          [params.id],
        );
        if (row.length === 0) return new Response('Not found', { status: 404 });
        const r = row[0];
        return {
          id: r.id,
          role: r.role,
          content: r.content,
          reasoning: r.reasoning,
          durationSec: r.duration_sec,
          tokenCount: r.token_count,
          modelName: r.model_name,
          modelType: r.model_type,
          parentId: r.parent_id,
          createdAt: new Date(r.created_at).toISOString(),
        };
      }

      values.push(params.id);
      const result = await AppDataSource.query(
        `UPDATE messages SET ${updates.join(', ')} WHERE id = $${idx}
         RETURNING id, role, content, reasoning, duration_sec, token_count, model_name, model_type, parent_id, created_at`,
        values,
      );
      if (result.length === 0) return new Response('Not found', { status: 404 });

      const r = result[0];
      return {
        id: r.id,
        role: r.role,
        content: r.content,
        reasoning: r.reasoning,
        durationSec: r.duration_sec,
        tokenCount: r.token_count,
        modelName: r.model_name,
        modelType: r.model_type,
        parentId: r.parent_id,
        createdAt: new Date(r.created_at).toISOString(),
      };
    },
    {
      body: t.Object({
        content: t.Optional(t.String()),
        reasoning: t.Optional(t.String()),
        durationSec: t.Optional(t.Number()),
        tokenCount: t.Optional(t.Number()),
        modelName: t.Optional(t.String()),
        modelType: t.Optional(t.Union([t.Literal('local'), t.Literal('api')])),
        parentId: t.Optional(t.String()),
      }),
      params: idParam,
    },
  )
  .delete('/:id', async ({ params }) => {
    const result = await AppDataSource.query(
      `DELETE FROM messages WHERE id = $1`,
      [params.id],
    );
    if (result.affected === 0) return new Response('Not found', { status: 404 });
    return new Response(null, { status: 204 });
  }, { params: idParam });

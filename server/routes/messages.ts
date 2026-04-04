import { Elysia, t } from 'elysia';
import { initializeDataSource } from '../db/data-source';
import { MessageRepository } from '../db/repositories';

export const messageRoutes = new Elysia({ prefix: '/messages' })
  .post(
    '/',
    async ({ body }) => {
      const message = MessageRepository.create({
        conversationId: body.conversationId,
        role: body.role,
        content: body.content,
        reasoning: body.reasoning ?? null,
        durationSec: body.durationSec ?? null,
        tokenCount: body.tokenCount ?? null,
        modelName: body.modelName ?? null,
        modelType: body.modelType ?? null,
        parentId: body.parentId ?? null,
      });
      const saved = await MessageRepository.save(message);
      return {
        id: saved.id,
        role: saved.role,
        content: saved.content,
        reasoning: saved.reasoning,
        durationSec: saved.durationSec,
        tokenCount: saved.tokenCount,
        modelName: saved.modelName,
        modelType: saved.modelType,
        parentId: saved.parentId,
        createdAt: saved.createdAt.toISOString(),
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
      const updateData: Record<string, any> = {};
      if (body.content !== undefined) updateData.content = body.content;
      if (body.reasoning !== undefined) updateData.reasoning = body.reasoning;
      if (body.durationSec !== undefined) updateData.durationSec = body.durationSec;
      if (body.tokenCount !== undefined) updateData.tokenCount = body.tokenCount;
      if (body.modelName !== undefined) updateData.modelName = body.modelName;
      if (body.modelType !== undefined) updateData.modelType = body.modelType;
      if (body.parentId !== undefined) updateData.parentId = body.parentId;

      const result = await MessageRepository.update(params.id, updateData);
      if (result.affected === 0) return new Response('Not found', { status: 404 });

      const updated = await MessageRepository.findOne({ where: { id: params.id } });
      if (!updated) return new Response('Not found', { status: 404 });
      return {
        id: updated.id,
        role: updated.role,
        content: updated.content,
        reasoning: updated.reasoning,
        durationSec: updated.durationSec,
        tokenCount: updated.tokenCount,
        modelName: updated.modelName,
        modelType: updated.modelType,
        parentId: updated.parentId,
        createdAt: updated.createdAt.toISOString(),
      };
    },
    {
      body: t.Object({
        content: t.Optional(t.String()),
        reasoning: t.Optional(t.String()),
        durationSec: t.Optional(t.Number()),
        tokenCount: t.Optional(t.Number()),
        modelName: t.Optional(t.String()),
        modelType: t.Optional(t.String()),
        parentId: t.Optional(t.String()),
      }),
    },
  )
  .delete('/:id', async ({ params }) => {
    await initializeDataSource();
    const result = await MessageRepository.delete(params.id);
    if (result.affected === 0) return new Response('Not found', { status: 404 });
    return new Response(null, { status: 204 });
  });

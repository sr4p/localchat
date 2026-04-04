import { Elysia, t } from 'elysia';
import { ConversationRepository } from '../db/repositories';

export const conversationRoutes = new Elysia({ prefix: '/conversations' })
  .get('/', async () => {
    const conversations = await ConversationRepository.find({
      order: { updatedAt: 'DESC' },
    });

    const results = await Promise.all(
      conversations.map(async (c) => {
        const count = await ConversationRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('messages', 'm')
          .where('m.conversation_id = :id', { id: c.id })
          .getRawOne();
        return {
          id: c.id,
          title: c.title,
          messageCount: Number(count?.count ?? 0),
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    );

    return results;
  })
  .post(
    '/',
    async ({ body }) => {
      const conversation = ConversationRepository.create({
        ...(body?.title ? { title: body.title } : {}),
      });
      const saved = await ConversationRepository.save(conversation);
      return {
        id: saved.id,
        title: saved.title,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
      }),
    },
  )
  .get('/:id', async ({ params }) => {
    const conversation = await ConversationRepository.findOne({
      where: { id: params.id },
      relations: ['messages'],
    });
    if (!conversation) return new Response('Not found', { status: 404 });

    // Sort messages by createdAt in-memory (order on nested relations is unreliable with string-based entity refs)
    conversation.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const messages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
      durationSec: m.durationSec,
      tokenCount: m.tokenCount,
      modelName: m.modelName,
      modelType: m.modelType,
      parentId: m.parentId,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    };
  })
  .delete('/:id', async ({ params }) => {
    const result = await ConversationRepository.delete(params.id);
    if (result.affected === 0) return new Response('Not found', { status: 404 });
    return new Response(null, { status: 204 });
  })
  .patch(
    '/:id',
    async ({ params, body }) => {
      await ConversationRepository.update(params.id, { title: body.title });
      const updated = await ConversationRepository.findOne({ where: { id: params.id } });
      if (!updated) return new Response('Not found', { status: 404 });
      return {
        id: updated.id,
        title: updated.title,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
    {
      body: t.Object({
        title: t.String(),
      }),
    },
  );

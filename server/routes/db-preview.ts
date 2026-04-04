import { Elysia } from 'elysia';
import { ConversationRepository, MessageRepository } from '../db/repositories';

export const dbPreviewRoutes = new Elysia({ prefix: '/db-preview' })
  .get('/stats', async () => {
    const conversationCount = await ConversationRepository.count();

    const messageCount = await MessageRepository.count();

    const raw = await MessageRepository.manager
      .createQueryBuilder()
      .select('model_name', 'model_name')
      .addSelect('COUNT(*)', 'count')
      .from('messages', 'm')
      .where('model_name IS NOT NULL')
      .groupBy('model_name')
      .getRawMany();

    const usageByModel = raw.reduce<Record<string, number>>((acc, row) => {
      acc[row.model_name ?? 'unknown'] = Number(row.count);
      return acc;
    }, {});

    const recent = await MessageRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'role', 'content', 'modelName', 'createdAt'],
    });

    return {
      conversationCount,
      messageCount,
      usageByModel,
      recentMessages: recent.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content.slice(0, 120),
        modelName: m.modelName ?? 'unknown',
        createdAt: m.createdAt.toISOString(),
      })),
    };
  })
  .get('/conversations', async () => {
    const conversations = await ConversationRepository.find({
      select: ['id', 'title', 'createdAt', 'updatedAt'],
      order: { updatedAt: 'DESC' },
    });

    const results = await Promise.all(
      conversations.map(async (c) => {
        const count = await MessageRepository.count({ where: { conversationId: c.id } });
        return {
          id: c.id,
          title: c.title,
          messageCount: count,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    );

    return results;
  })
  .get('/messages/:conversationId', async ({ params }) => {
    const messages = await MessageRepository.find({
      where: { conversationId: params.conversationId },
      order: { createdAt: 'ASC' },
      select: [
        'id',
        'role',
        'content',
        'reasoning',
        'durationSec',
        'tokenCount',
        'modelName',
        'modelType',
        'createdAt',
      ],
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
      durationSec: m.durationSec,
      tokenCount: m.tokenCount,
      modelName: m.modelName,
      modelType: m.modelType,
      createdAt: m.createdAt.toISOString(),
    }));
  });

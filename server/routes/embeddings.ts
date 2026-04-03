import { Elysia, t } from 'elysia'
import { initializeDataSource } from '../db/data-source'
import { MessageEmbeddingRepository } from '../db/repositories'

export const embeddingRoutes = new Elysia({ prefix: '/embeddings' })
  .post('/sync', async ({ body }) => {
    await initializeDataSource()
    let synced = 0
    for (const item of body.items) {
      const existing = await MessageEmbeddingRepository.findOne({
        where: { messageId: item.messageId },
      })
      if (existing) {
        await MessageEmbeddingRepository.update(existing.id, { embedding: item.embedding })
      } else {
        const embedding = MessageEmbeddingRepository.create({
          messageId: item.messageId,
          embedding: item.embedding,
        })
        await MessageEmbeddingRepository.save(embedding)
      }
      synced++
    }
    return { synced }
  }, {
    body: t.Object({
      items: t.Array(t.Object({
        messageId: t.String(),
        embedding: t.Array(t.Number()),
      })),
    }),
  })
  .post('/suggestions', async ({ body }) => {
    await initializeDataSource()
    const convId = body.conversationId
    const embedding = body.embedding
    const excludeIds = body.excludeMessageIds ?? []
    const limit = body.limit ?? 5

    if (!embedding || embedding.length === 0) {
      return []
    }

    const vectorStr = `[${embedding.join(',')}]`

    if (excludeIds.length === 0) {
      excludeIds.push('00000000-0000-0000-0000-000000000000')
    }

    const results = await MessageEmbeddingRepository.manager.query(`
      SELECT m.id, m.content, me.embedding <=> $1::vector AS similarity
      FROM message_embeddings me
      INNER JOIN messages m ON me.message_id = m.id
      WHERE m.conversation_id = $2
        AND m.role = 'user'
        AND m.id != ALL($3::uuid[])
      ORDER BY similarity ASC
      LIMIT $4
    `, [vectorStr, convId, excludeIds, limit])

    return results.map((r: any) => ({
      content: r.content,
      similarity: r.similarity,
    }))
  }, {
    body: t.Object({
      conversationId: t.String(),
      embedding: t.Array(t.Number()),
      excludeMessageIds: t.Optional(t.Array(t.String())),
      limit: t.Optional(t.Number()),
    }),
  })

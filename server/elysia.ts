import { Elysia } from 'elysia';
import { conversationRoutes } from './routes/conversations';
import { messageRoutes } from './routes/messages';
import { embeddingRoutes } from './routes/embeddings';
import { dbPreviewRoutes } from './routes/db-preview';
import { startDataSource } from './db/data-source';

await startDataSource();

export const elysia = new Elysia({ prefix: '/api' })
  .onError(({ set }) => {
    // Hide internal stack traces from clients
    set.status = 500;
    return { error: 'Internal server error' };
  })
  .use(conversationRoutes)
  .use(messageRoutes)
  .use(embeddingRoutes);

// Only register debug endpoints in development
if (process.env.NODE_ENV !== 'production') {
  elysia.use(dbPreviewRoutes);
}

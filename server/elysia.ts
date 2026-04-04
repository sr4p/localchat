import { Elysia } from 'elysia';
import { conversationRoutes } from './routes/conversations';
import { messageRoutes } from './routes/messages';
import { embeddingRoutes } from './routes/embeddings';
import { dbPreviewRoutes } from './routes/db-preview';
import { startDataSource } from './db/data-source';

await startDataSource();

export const elysia = new Elysia({ prefix: '/api' })
  .use(conversationRoutes)
  .use(messageRoutes)
  .use(embeddingRoutes)
  .use(dbPreviewRoutes);

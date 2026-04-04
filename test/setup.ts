import 'reflect-metadata';
import '../server/db/pgvector-patch';
import { DataSource } from 'typeorm';
import { Conversation, Message, MessageEmbedding } from '../server/db/entities';

export const TestDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'test',
  password: 'test',
  database: 'chat_ai_test',
  entities: [Conversation, Message, MessageEmbedding],
  synchronize: false,
  logging: false,
});

export async function setupTestDb(): Promise<DataSource> {
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
  }
  return TestDataSource;
}

export async function teardownTestDb(): Promise<void> {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
}

export async function truncateAll(): Promise<void> {
  if (!TestDataSource.isInitialized) return;
  await TestDataSource.query(
    'TRUNCATE TABLE message_embeddings, messages, conversations RESTART IDENTITY CASCADE',
  );
}

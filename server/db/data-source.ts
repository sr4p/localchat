import 'reflect-metadata';
import './pgvector-patch';
import { DataSource } from 'typeorm';
import { Conversation, Message, MessageEmbedding } from './entities';

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: getEnv('DB_HOST', 'localhost'),
  port: Number.parseInt(getEnv('DB_PORT', '5432'), 10),
  username: getEnv('DB_USER', 'postgres'),
  password: getEnv('DB_PASSWORD', 'postgres'),
  database: getEnv('DB_NAME', 'chat_ai'),
  entities: [Conversation, Message, MessageEmbedding],
  synchronize: true,
  logging: process.env.NODE_ENV !== 'production',
});

export async function initializeDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) return AppDataSource;
  return AppDataSource.initialize();
}

export async function startDataSource() {
  try {
    console.log('Initializing TypeORM DataSource...');
    await initializeDataSource();
    console.log('DataSource initialized successfully');
  } catch (error) {
    await AppDataSource.destroy();
    console.log('DataSource destroyed. Schema sync complete.');
    console.error('Failed to sync schema:', error);
    process.exit(1);
  }
}

import 'reflect-metadata';
import './db/pgvector-patch';
import { DataSource } from 'typeorm';
import { Conversation, Message, MessageEmbedding } from './db/entities';

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let _dataSource: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!_dataSource) {
    _dataSource = new DataSource({
      type: 'postgres',
      host: getEnv('DB_HOST', 'localhost'),
      port: Number.parseInt(getEnv('DB_PORT', '5432'), 10),
      username: getEnv('DB_USER', 'postgres'),
      password: getEnv('DB_PASSWORD', 'postgres'),
      database: getEnv('DB_NAME', 'chat_ai'),
      entities: [Conversation, Message, MessageEmbedding],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
    });
  }
  return _dataSource;
}

export async function ensureDataSource(): Promise<DataSource> {
  const ds = getDataSource();
  if (!ds.isInitialized) {
    await ds.initialize();
  }
  return ds;
}

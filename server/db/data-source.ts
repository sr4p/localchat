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
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: 20,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  },
});

export async function initializeDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) return AppDataSource;
  return AppDataSource.initialize();
}

async function ensureIndexes() {
  // Unique constraint required for ON CONFLICT upserts in embeddings sync.
  await AppDataSource.query(
    `ALTER TABLE message_embeddings ADD CONSTRAINT uq_message_embeddings_message_id UNIQUE (message_id)`,
  ).catch(() => {
    // Constraint already exists — that's fine.
  });

  // HNSW index for vector similarity search (optional, fails gracefully).
  await AppDataSource.query(
    `CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
    ON message_embeddings USING hnsw (embedding vector_l2_ops)
    WITH (m = 16, ef_construction = 64)`,
  ).catch(() => {
    // eslint-disable-next-line no-console
    console.error('HNSW index skipped: vector column has no dimension or pgvector version too old');
  });
}

export async function startDataSource() {
  try {
    await initializeDataSource();
    // await ensureIndexes();
  } catch (error) {
    await AppDataSource.destroy();
    console.error('Failed to initialize DataSource:', error);
    process.exit(1);
  }
}

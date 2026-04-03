# Plan: PostgreSQL + pgvector for Chat History

## Context

This is a Next.js app (Gemma-4 LLM via WebGPU in browser). Chat history is currently **in-memory only** — lost on refresh. No Docker, no database, no persistence exists.

**Goal**: Add production-ready PostgreSQL + pgvector infrastructure with ElysiaJS API routes inside Next.js for persistent chat history with semantic search capability.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│  ┌───────────────────────────────────────────┐   │
│  │  Frontend (React/WebGPU)                  │   │
│  │  - ChatApp.tsx (UI)                       │   │
│  │  - LLMProvider.tsx (in-browser LLM)       │   │
│  └──────────────┬────────────────────────────┘   │
│                 │ fetch                          │
│  ┌──────────────▼────────────────────────────┐   │
│  │  ElysiaJS API (app/api/[[...slugs]])      │   │
│  │  - POST /api/chats       (create)         │   │
│  │  - GET  /api/chats       (list)           │   │
│  │  - GET  /api/chats/:id   (get)            │   │
│  │  - POST /api/chats/:id/messages           │   │
│  │  - POST /api/chats/search  (vector)       │   │
│  └──────────────┬────────────────────────────┘   │
└─────────────────┼────────────────────────────────┘
                  │ TypeORM (DataSource)
                  ▼
        ┌─────────────────────┐
        │  PostgreSQL 17 +    │
        │  pgvector 0.8.2     │
        │  (Docker Compose)   │
        └─────────────────────┘
```

---

## Step 1: Docker Compose — PostgreSQL + pgvector

### Files to create

**`docker-compose.yml`**
```yaml
services:
  postgres:
    image: pgvector/pgvector:0.8.2-pg17-trixie
    container_name: chat-ai-postgres
    environment:
      POSTGRES_USER: chatapp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-chatapp_secret}
      POSTGRES_DB: chatapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    command: >
      postgres
      -c shared_preload_libraries=pg_stat_statements
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=128MB
      -c max_connections=100
      -c log_statement=all
    shm_size: 256mb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatapp"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

**`docker/postgres/init.sql`**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'New Chat',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    reasoning       TEXT,
    meta            JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_embeddings (
    id              BIGSERIAL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    embedding       vector(384) NOT NULL,
    content_hash    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX idx_messages_role ON messages (role);

CREATE INDEX idx_embeddings_hnsw
    ON message_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_conversation ON message_embeddings (conversation_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversations_updated
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Why vector(384)?** — Since this runs locally, we'll use a small embedding model (e.g., `nomic-embed-text` at 768 or a distilled model at 384). For browser-based embedding, smaller dimensions = faster inference. Can be adjusted later.

---

## Step 2: Install Dependencies

```bash
bun add elysia @elysiajs/eden @elysiajs/cors typeorm pg reflect-metadata
```

- `elysia` — API framework
- `@elysiajs/eden` — end-to-end type safety
- `@elysiajs/cors` — CORS middleware (if needed)
- `typeorm` — ORM with entity management, migrations, and pgvector support
- `pg` — PostgreSQL driver (required by TypeORM)
- `reflect-metadata` — TypeORM decorator metadata (must be imported first)

---

## Step 3: TypeORM Setup

### 3.1 DataSource Configuration

**`lib/db/data-source.ts`**
```typescript
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Conversation } from './entities/Conversation'
import { Message } from './entities/Message'
import { MessageEmbedding } from './entities/MessageEmbedding'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'chatapp',
  password: process.env.DATABASE_PASSWORD ?? 'chatapp_secret',
  database: process.env.DATABASE_NAME ?? 'chatapp',
  entities: [Conversation, Message, MessageEmbedding],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
})
```

### 3.2 Entity Definitions

**`lib/db/entities/Conversation.ts`**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Message } from './Message'

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ default: 'New Chat' })
  title: string

  @OneToMany(() => Message, (msg) => msg.conversation, { cascade: true })
  messages: Message[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
```

**`lib/db/entities/Message.ts`**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm'
import { Conversation } from './Conversation'
import { MessageEmbedding } from './MessageEmbedding'

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation

  @Column()
  role: 'user' | 'assistant' | 'system'

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'text', nullable: true })
  reasoning: string | null

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, unknown>

  @OneToOne(() => MessageEmbedding, (emb) => emb.message, { cascade: true })
  embedding?: MessageEmbedding

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
```

**`lib/db/entities/MessageEmbedding.ts`** — pgvector column
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, OneToOne } from 'typeorm'
import { Message } from './Message'

@Entity('message_embeddings')
export class MessageEmbedding {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string

  @OneToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message

  @Column({ type: 'vector', array: true, dimension: 384 })
  embedding: number[]

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string

  @Column({ name: 'content_hash', nullable: true })
  contentHash: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
```

Note: TypeORM doesn't natively support pgvector's `vector` type. We need a custom column type. Create a PostgresDriver extension:

**`lib/db/postgres-driver.ts`**
```typescript
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver'

const originalCreateFullType = PostgresDriver.prototype.createFullType

PostgresDriver.prototype.createFullType = function (column, mode) {
  if (column.type === 'vector') {
    const dim = column.typeOptions?.dimension ?? 384
    return `vector(${dim})`
  }
  return originalCreateFullType.call(this, column, mode)
}
```

Import this in `data-source.ts` before creating the DataSource.

### 3.3 Repository Services

**`lib/db/repositories.ts`**
```typescript
import { AppDataSource } from './data-source'
import { Conversation } from './entities/Conversation'
import { Message } from './entities/Message'
import { MessageEmbedding } from './entities/MessageEmbedding'

export const conversationRepo = AppDataSource.getRepository(Conversation)
export const messageRepo = AppDataSource.getRepository(Message)
export const embeddingRepo = AppDataSource.getRepository(MessageEmbedding)
```

---

## Step 4: ElysiaJS API Routes

**`app/api/[[...slugs]]/route.ts`**
```typescript
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'

import { conversationRoutes } from './conversations'
import { searchRoutes } from './search'

export const app = new Elysia({ prefix: '/api' })
  .use(cors())
  .use(conversationRoutes)
  .use(searchRoutes)

export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
```

### Route structure

**`app/api/conversations.ts`** — Elysia plugin
```
GET    /api/chats              → list conversations (paginated, 20 default)
POST   /api/chats              → create conversation { title? }
GET    /api/chats/:id          → get conversation with messages
DELETE /api/chats/:id          → delete conversation
POST   /api/chats/:id/messages → add message { role, content, reasoning?, embedding? }
```

**`app/api/search.ts`** — Elysia plugin
```
POST   /api/chats/search       → semantic search { query: string, embedding: number[], limit?: number, conversationId?: string }
```

All routes use `t.Object()` for body validation, return structured responses with proper HTTP status codes. Use TypeORM repositories from `lib/db/repositories.ts` for all DB operations.

---

## Step 5: Embedding Strategy

Since the LLM runs in-browser via WebGPU, we have two options for generating embeddings:

**Option A: Server-side embedding** (Recommended)
- Client sends message text to API
- API generates embedding using a Node.js embedding model (e.g., `@xenova/transformers` with a small model)
- Stores embedding + message in one transaction

**Option B: Client-side embedding**
- Generate embedding in browser alongside the LLM
- Send embedding with the message payload
- Less server load, but adds browser memory pressure

**Recommendation**: Start with Option A for simplicity. The API route accepts the message, generates the embedding server-side, and stores both atomically.

---

## Step 6: Frontend Integration

Modify `LLMProvider.tsx` to:
1. On `send()`, after adding user message to state → POST to `/api/chats/:id/messages`
2. On generation complete → POST assistant response to same endpoint
3. On mount → fetch existing conversation if `conversationId` in URL
4. On `clearChat()` → create new conversation via POST `/api/chats`

Add conversation sidebar/list component that fetches `GET /api/chats`.

---

## Step 7: Environment Configuration

**`.env.local`** (gitignored)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=chatapp
DATABASE_PASSWORD=chatapp_secret
DATABASE_NAME=chatapp
```

**`.env.example`** (committed)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=chatapp
DATABASE_PASSWORD=
DATABASE_NAME=chatapp
```

---

## Step 8: Package.json Scripts

```json
{
  "scripts": {
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:logs": "docker compose logs -f postgres",
    "db:reset": "docker compose down -v && docker compose up -d"
  }
}
```

---

## File Tree (new files)

```
chat-ai-webgpu/
├── docker-compose.yml                    [NEW]
├── docker/
│   └── postgres/
│       └── init.sql                      [NEW]
├── .env.local                            [NEW]
├── .env.example                          [NEW]
├── lib/
│   └── db/
│       ├── data-source.ts                [NEW]
│       ├── postgres-driver.ts            [NEW]
│       ├── repositories.ts               [NEW]
│       └── entities/
│           ├── Conversation.ts           [NEW]
│           ├── Message.ts                [NEW]
│           └── MessageEmbedding.ts       [NEW]
├── app/
│   └── api/
│       └── [[...slugs]]/
│           ├── route.ts                  [NEW]
│           ├── conversations.ts          [NEW]
│           └── search.ts                 [NEW]
└── package.json                          [MODIFIED]
```

---

## Tradeoffs & Considerations

1. **Embedding dimension (384)** — Chosen for small local models. If you later use OpenAI/Cohere, change to 1536/1024 and update `init.sql` + `MessageEmbedding` entity.

2. **TypeORM pgvector support** — TypeORM doesn't natively support `vector` column type. We patch `PostgresDriver.createFullType` to emit `vector(N)`. For production, consider using `typeorm-pgvector` package or raw queries for vector operations.

3. **No auth layer yet** — Add `user_id` column and JWT middleware when multi-user support is needed.

4. **HNSW index params** — `m=16, ef_construction=64` are conservative defaults. Tune based on dataset size and recall requirements.

5. **Production deployment** — This Docker Compose is for local dev. For production:
   - Use managed Postgres (Supabase, Neon, AWS RDS)
   - Set `POSTGRES_PASSWORD` via secrets manager
   - Add connection pooling (pgBouncer) for >100 connections
   - Move `shm_size` and `command` overrides to managed service config

6. **Streaming compatibility** — The current WebGPU streaming generation happens client-side. The API only stores completed messages. If you want to stream to the DB in real-time, batch writes every N tokens.

7. **TypeORM synchronize** — Set to `false` in production. Use migrations (`typeorm migration:generate`, `typeorm migration:run`) for schema changes.

---

## Execution Order

1. Create Docker Compose + init SQL
2. Install dependencies
3. Create database client module
4. Create ElysiaJS API routes
5. Add environment files
6. Update package.json scripts
7. (Optional) Frontend integration — wire LLMProvider to API

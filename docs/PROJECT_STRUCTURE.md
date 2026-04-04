# Project structure and services

Generated from the “learn the codebase” plan. Paths are repo-relative.

## User journey (client)

1. **`app/App.tsx`** — Stages: `LiquidIntro` → `LandingPage` → (after model ready) `ChatApp`.
2. **`LandingPage`** — CTA calls `onStart` → `loadModel()` from `useLLM` (WebGPU model download via Transformers.js).
3. **`ChatApp`** — Uses `useLLM()` for `send`, `stop`, `clearChat`, messages, suggestions, `ModelSelector`.
4. **`LLMProvider`** (`app/hooks/LLMProvider.tsx`) — Core state:
   - Loads generator with `@huggingface/transformers` `pipeline('text-generation', …, { device: 'webgpu' })`.
   - Parses thinking/content via `ThinkStreamParser`.
   - Persists messages and loads conversations through **`app/utils/api-client.ts`** (`fetch` to `/api/...`).

### Client → API calls (from `LLMProvider`)

| Action | Method | Path |
|--------|--------|------|
| List conversations (mount, log only) | GET | `/api/conversations` |
| Create conversation | POST | `/api/conversations` |
| Conversation detail | GET | `/api/conversations/:id` |
| Delete conversation | DELETE | `/api/conversations/:id` |
| Create message | POST | `/api/messages` |
| Sync embeddings | POST | `/api/embeddings/sync` |
| Similar-message suggestions | POST | `/api/embeddings/suggestions` |

Session helpers also use `createConversation`, `loadConversation`, `deleteConversation` (same paths).

## HTTP stack

- **`app/api/[[...route]]/route.ts`** — Forwards all methods to **`server/elysia.ts`** `elysia.fetch(request)`.
- **`server/elysia.ts`** — `prefix: '/api'`, `await startDataSource()` at module load, then mounts route plugins.

## Elysia routes (prefix `/api`)

### `/conversations` (`server/routes/conversations.ts`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/conversations` | List + `messageCount` per row |
| POST | `/api/conversations` | Body `{ title?: string }` — optional title uses DB default |
| GET | `/api/conversations/:id` | Includes ordered `messages` |
| DELETE | `/api/conversations/:id` | 204 |
| PATCH | `/api/conversations/:id` | `{ title: string }` |

### `/messages` (`server/routes/messages.ts`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/messages` | Create (role, content, optional reasoning, metrics, `parentId`) |
| PUT | `/api/messages/:id` | Partial update |
| DELETE | `/api/messages/:id` | Calls `initializeDataSource()` before delete |

### `/embeddings` (`server/routes/embeddings.ts`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/embeddings/sync` | Batch upsert by `messageId` |
| POST | `/api/embeddings/suggestions` | pgvector `<=>`, user messages in conversation |

### `/db-preview` (`server/routes/db-preview.ts`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/db-preview/stats` | Counts, model usage, recent messages |
| GET | `/api/db-preview/conversations` | List with counts |
| GET | `/api/db-preview/messages/:conversationId` | Messages for one conversation |

## Data layer

- **Config:** `server/db/data-source.ts` — `AppDataSource`, env: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (see `.env.example`). `synchronize: false`; schema from SQL.
- **Schema:** `docker/postgres/init.sql` — `vector` extension, tables `conversations`, `messages`, `message_embeddings`, HNSW index on embeddings (384-d).
- **ORM mapping:** `server/db/entities/` — column names use **snake_case** (`created_at`, `updated_at`, `parent_id`, …) to match `init.sql`.
- **Repositories:** `server/db/repositories.ts` — `ConversationRepository`, `MessageRepository`, `MessageEmbeddingRepository` on `AppDataSource`.
- **pgvector + TypeORM:** `server/db/pgvector-patch.ts` patches Postgres driver for `vector(dim)` DDL typing.

## Local infra

- **App DB:** `docker/docker-compose.yml` — Postgres 17 + pgvector on port 5432.
- **Test DB:** `test/docker-compose.yml` — port **5433**, DB `chat_ai_test`, same `init.sql` via volume.

## Tests

- **`bun run test:db`** — Starts test compose, runs `test/db.spec.ts`, tears down. Uses `TestDataSource` in `test/setup.ts` (not `AppDataSource`).

## Chosen improvement theme (next iteration)

**Reliability + DX (short term)**

- **Done in this pass:** `package.json` scripts pointed at `test/` paths; DB tests use `TestDataSource` repositories; entity columns aligned with `init.sql`; `POST /api/conversations` accepts optional `title` for `createConversation()`.
- **Suggested next:** Integration tests for Elysia routes; README with setup/run (replace HF Space-only frontmatter); consider lazy `startDataSource()` vs top-level `await` in serverless/cold-start contexts.

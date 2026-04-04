# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based AI chat application that runs LLM inference locally via WebGPU using `@huggingface/transformers`. The app uses Next.js for the frontend with server-side API routes powered by Elysia.js, and PostgreSQL with pgvector for conversation history and embedding-based suggestions.

## Tech Stack

- **Frontend:** Next.js 16 (SSR disabled — entire app is client-side), React 19, TailwindCSS 4
- **Inference:** `@huggingface/transformers` with WebGPU backend (q4 quantized models)
- **API:** Elysia.js (mounted as API routes within Next.js dev server)
- **Database:** PostgreSQL 17 with pgvector 0.8.2 via TypeORM
- **Embedding Model:** Qwen3-Embedding-0.6B-ONNX (runs client-side via WebGPU)
- **Test Runner:** Bun (bun:test)
- **Renderer:** Streamdown (markdown/LaTeX rendering for assistant responses)

## Key Commands

```bash
# Development
npm run dev              # Start Next.js dev server with Turbopack

# Build
npm run build            # Next.js production build
npm run lint             # ESLint

# Database
npm run db:up            # Start PostgreSQL + pgvector via docker compose
npm run db:down          # Stop database
npm run db:logs          # Follow database logs
npm run db:reset         # Destroy and recreate database (loses data)
npm run schema:sync      # Sync TypeORM schema to database

# Tests
npm run test:db          # Start test DB, run DB tests, teardown
```

## Environment Variables

Copy `.env.example` to `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=chat_ai
```

## Architecture

### Frontend (`app/`)

**Entry point:** `app/page.tsx` → renders `<ClientOnly />` from `app/client.tsx`, which wraps the app in `<EmbeddingProvider>` → `<LLMProvider>` → `<App>`. SSR is disabled (`ssr: false`).

**App flow** (`app/App.tsx`): LiquidIntro animation → LandingPage (shows model download progress) → ChatApp

**State management:** React Context via two providers:

- **EmbeddingProvider** (`app/hooks/EmbeddingProvider.tsx`): Loads Qwen3 embedding model on WebGPU, provides `generate(text)` and `generateBatch(texts)`
- **LLMProvider** (`app/hooks/LLMProvider.tsx`): Manages chat state, model loading, generation, conversation persistence. Provides `send`, `stop`, `editMessage`, `reQuestion`, `reAnswer`, `createConversation`, `loadConversation`, `deleteConversation`, model switching via `activeModelId`/`setActiveModelId`, vector suggestions via `suggestions` state, undo/redo via `undo`/`redo`/`canUndo`/`canRedo`, sidebar toggle via `sidebarOpen`/`setSidebarOpen`, conversation list via `conversations`/`loadConversations`, and page navigation via `activePage`/`setActivePage`

**Key components:**

- `ChatApp` — main chat UI with sidebar, header navbar, message list, tree view, undo/redo
- `MessageBubble` — individual message display with edit/re-question/re-answer/copy
- `MessageTree` — renders messages as parent/child tree nodes
- `ConversationList` — left sidebar conversation history panel
- `ConversationItem` — single conversation row in sidebar
- `ModelSelector` — embedded model pill in input field
- `LiquidIntro` / `LandingPage` — splash/landing screens

### API Routes (`server/routes/`)

All routes prefixed with `/api` via Elysia mounted in Next.js API route handler:

| Route                         | Method | Purpose                                     |
| ----------------------------- | ------ | ------------------------------------------- |
| `/api/conversations`          | GET    | List all conversations                      |
| `/api/conversations`          | POST   | Create conversation                         |
| `/api/conversations/:id`      | GET    | Get conversation with messages              |
| `/api/conversations/:id`      | DELETE | Delete conversation                         |
| `/api/conversations/:id`      | PATCH  | Update conversation title                   |
| `/api/messages`               | POST   | Create message                              |
| `/api/messages/:id`           | PUT    | Update message                              |
| `/api/messages/:id`           | DELETE | Delete message                              |
| `/api/embeddings/sync`        | POST   | Upsert message embeddings (batch)           |
| `/api/embeddings/suggestions` | POST   | Get similar questions via vector similarity |

### Database (`server/db/`)

**Entities** (all UUID primary keys):

- **Conversation** — `conversations` table: id, title, createdAt, updatedAt
- **Message** — `messages` table: id, conversationId (FK), role, content, reasoning, durationSec, tokenCount, modelName, modelType, parentId, createdAt. Has OneToMany to MessageEmbedding
- **MessageEmbedding** — `message_embeddings` table (co-located in `Message.ts`): id, messageId (FK with CASCADE delete), embedding (vector), createdAt

Note: `Message` and `MessageEmbedding` are in the same file to avoid circular import issues. Entity relationships use string-based references (`@ManyToOne('Conversation', 'messages')`).

**Important:** `synchronize: true` is set in dev — schema is auto-synced via TypeORM. The `pgvector` column type requires a patch file (`server/db/pgvector-patch.ts`) that adds the `vector` type to TypeORM's postgres driver at import time.

### Test Infrastructure (`test/`)

Uses a separate test database via `test/docker-compose.yml`. `test/setup.ts` provides `setupTestDb()`, `teardownTestDb()`, `truncateAll()`. Run with `npm run test:db`.

## Model Registry (`app/utils/model-registry.ts`)

Models are defined as `ModelConfig[]`. Each has: id, displayName, hfRepo, type (local/api), dtype, maxNewTokens, supportsReasoning. The active model is tracked via `activeModelId` state in LLMProvider and can be switched mid-conversation.

## Embedding Flow

1. LLMProvider auto-loads embedding model when first conversation becomes active
2. On each user message sent, embedding is generated client-side and posted to `/api/embeddings/sync`
3. After assistant responds, suggestions are fetched by embedding the last user message and querying `/api/embeddings/suggestions`
4. Suggestions appear as inline cards below messages

## Features

### Chat & Messages
- **Send/Receive** — send text messages, stream assistant responses from WebGPU model
- **Reasoning display** — toggle between `<think>` reasoning blocks and final answer
- **Edit user message** — pencil icon on hover, edit content and re-generate from that point
- **Re-answer** — discard assistant response and regenerate with current model
- **Copy response** — one-click copy assistant message to clipboard
- **Suggested questions** — vector-similarity-based suggestion cards after each assistant response
- **Example prompts** — four starter prompts on the welcome screen

### Conversation Management
- **Sidebar history** — left panel showing all conversations with title, message count, relative time
- **New chat** — creates blank conversation and switches to it
- **Delete conversation** — trash icon on hover in sidebar
- **Switch conversation** — click any sidebar item to load that conversation
- **Conversation persistence** — all conversations and messages saved to PostgreSQL

### Message History (Undo/Redo)
- **Undo** (`Ctrl+Z` / `Cmd+Z`) — revert the last message action (send, edit, re-question, re-answer)
- **Redo** (`Ctrl+Shift+Z` / `Cmd+Shift+Z`) — re-apply a previously undone action
- **Header buttons** — undo/redo icons in the right section of the header
- **Stack depth** — up to 20 checkpoints

### Message Tree View
- **Toggle linear/tree** — `GitBranch` icon in header switches between list and tree view
- **Tree layout** — messages shown as parent/child nodes using `parentId` links
- **Select & scroll** — clicking a tree node scrolls to that message in the linear view

### Navigation & Layout
- **Sidebar toggle** — `PanelLeft` / `PanelLeftClose` button in header
- **Navbar menu** — dropdown selector (Chat, Settings) in header center
- **Responsive** — sidebar collapses on small screens, "New chat" text hidden on mobile

### Metrics Display
- **Live generation stats** — elapsed time and tokens/sec shown during streaming
- **Completed response stats** — duration and token count shown after generation finishes
- **Thinking timer** — tracks reasoning/pre-fill duration separately

### Skills

This project should use the following skills for optimal development:

| Skill | Trigger When |
|-------|-------------|
| `frontend-design` | Building or modifying UI components — production-grade design, responsive, animation |
| `next-best-practices` | Working with Next.js — file conventions, RSC boundaries, data patterns, async components |
| `next-cache-components` | Optimizing Next.js caching — PPR, cache directive, cacheLife, cacheTag, use cache |
| `elysia-js` | Adding or modifying API routes on the Elysia.js server |
| `typescript-pro` | Advanced TypeScript types, generics, type guards, utility types |
| `coding-standards` | Universal coding standards, best practices, patterns for TypeScript/JavaScript |
| `supabase-postgres-best-practices` | Database queries, indexing, schema design, performance optimization for PostgreSQL |
| `documentation-lookup` | Looking up library/API docs for `@huggingface/transformers`, pgvector, WebGPU, TailwindCSS 4 |
| `fix` | Lint errors, formatting issues, or before committing code |
| `ultrathink` | Complex architecture decisions, multi-system debugging, ambiguous problems requiring deep analysis |

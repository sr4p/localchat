# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a Private Chai AI Local Chat App for Me
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
- **LLMProvider** (`app/hooks/LLMProvider.tsx`): Manages chat state, model loading, generation, conversation persistence. Provides `send`, `stop`, `editMessage`, `reQuestion`, `reAnswer`, `createConversation`, `loadConversation`, `deleteConversation`, model switching via `activeModelId`/`setActiveModelId`, vector suggestions via `suggestions` state, undo/redo via `undo`/`redo`/`canUndo`/`canRedo`, sidebar toggle via `sidebarOpen`/`setSidebarOpen`, conversation list via `conversations`/`loadConversations`, and page navigation via `activePage`/`setActivePage`. Reads settings from `localStorage` to inject system prompt and max tokens into generation, and auto-generates conversation titles using `autoSummarize` when enabled.

**Key components:**

- `ChatApp` — main chat UI with sidebar, header navbar, message list, tree view, undo/redo, settings routing
- `MessageBubble` — individual message display with edit/re-question/re-answer/copy
- `MessageTree` — renders messages as parent/child tree nodes
- `ConversationList` — left sidebar conversation history panel
- `ConversationItem` — single conversation row in sidebar
- `ModelSelector` — embedded model pill in input field
- `SettingsPage` — settings UI (theme, generation, budget, data) at `activePage === 'settings'`
- `KeyboardShortcutsModal` — shortcuts help dialog, toggled with `?` key
- `TokenBudgetBanner` — color-coded usage indicator beneath chat
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

### Settings & Utilities

**`useAppSettings` hook** (`app/hooks/useAppSettings.ts`): React hook for reading/updating user settings from `localStorage`. Provides `settings`, `update(key, value)`, and `reset()`. Manages `.dark` class on `<html>` for theme toggling and `--chat-font-size` CSS variable for font sizing.

**`autoSummarize` utility** (`app/utils/autoSummarize.ts`): Generates concise conversation titles from the first user message. Strips code blocks, inline code, URLs, markdown links, and LaTeX. Truncates to 50 chars at word boundary.

**`exportChat` utility** (`app/utils/exportChat.ts`): Downloads conversations as JSON (full data with metadata) or Markdown (readable format with reasoning in `<details>`). Slug-based filename from conversation title.

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

- **Live generation stats** — elapsed time (1 decimal) and smoothed tokens/sec shown during streaming
- **Completed response stats** — duration and token count badges shown after generation finishes
- **Thinking timer** — tracks reasoning/pre-fill duration separately for `<think>` blocks
- **Thinking time per message** — stored in map, displayed next to assistant bubbles

### Model Management

- **Model switching** — switch active model mid-conversation via `ModelSelector` pill in input field
- **Model download progress** — LandingPage shows download percentage during initial model load
- **Multi-model registry** — models defined in `app/utils/model-registry.ts`, supports `type: 'local'` (WebGPU) and `type: 'api'`

### Streaming & Generation

- **Streaming response** — assistant responses streamed token-by-token via `TextStreamer` from `@huggingface/transformers`
- **Stop generation** — interrupt active stream with stop button (calls `InterruptableStoppingCriteria`)
- **Think stream parser** — parses `<think>` reasoning blocks separately from final answer via `ThinkStreamParser`
- **Auto-load embedding model** — Qwen3-Embedding-0.6B auto-loads on first conversation activation

### Message Branching

- **Re-question** — fork from a user message with new content, creates child node via `parentId` FK
- **Re-answer** — discard assistant response and regenerate with current model from the previous message
- **Tree persistence** — branched messages stored as parent/child via `parentId` in messages table
- **View toggle** — switch between flat list and tree hierarchy via `GitBranch` button in header

### Settings & Preferences

- **Settings page** — accessible from navbar dropdown, manages all user preferences via `activePage` routing
- **System prompt** — configurable in Settings, injected as first system message in generation context
- **Max tokens override** — per-user token limit overrides model defaults during generation
- **Font size** — 14–22px slider, scoped to `--chat-font-size` CSS custom property on `:root`
- **Persistent storage** — all settings stored in `localStorage` via `useAppSettings` hook

### Theme & Appearance

- **Dark mode** — toggle via Settings, toggles `.dark` class on `<html>` with full CSS variable overrides
- **Smooth transitions** — background/color transition on theme switch (200ms ease)
- **Dark scrollbar** — custom scrollbar colors for dark mode

### Keyboard Shortcuts

- **`?`** — toggle shortcuts help modal (ignored when typing in input)
- **`Ctrl+Z` / `Cmd+Z`** — undo last message action
- **`Ctrl+Shift+Z` / `Cmd+Shift+Z`** — redo undone action
- **`Enter`** — send message
- **`Shift+Enter`** — new line in textarea
- **`Escape`** — close modals, stop generation (ignored when typing in input)

### Token Management

- **Token budget** — configurable limit (1,000–100,000) with banner showing usage
- **Usage states** — green (under 80%), orange warning (80–100%), red exceeded (over 100%)
- **Animated progress bar** — visual fill showing percentage of budget consumed
- **Auto-summarize titles** — generates conversation title from first user message by default (can be toggled off)

### Data Export

- **Export conversation** — download as JSON (full data with metadata) or Markdown (readable format)
- **JSON export** — includes role, content, reasoning, duration, tokenCount, modelName per message
- **Markdown export** — heading-based formatting with `<details>` for reasoning blocks
- **File naming** — slug-based filenames derived from conversation title

### Database (`server/db/`)

**Entities** (all UUID primary keys):

- **Conversation** — `conversations` table: id, title, createdAt, updatedAt. Indexed on `updatedAt`.
- **Message** — `messages` table: id, conversationId (FK + index), role, content, reasoning, durationSec, tokenCount, modelName, modelType, parentId (index), createdAt. Has OneToMany to MessageEmbedding
- **MessageEmbedding** — `message_embeddings` table (co-located in `Message.ts`): id, messageId (FK + index + unique constraint), embedding (vector), createdAt

**Indexes:**

- `idx_embeddings_hnsw` — HNSW index on `message_embeddings.embedding` (vector_l2_ops) for vector similarity
- FK indexes on `messages.conversation_id`, `messages.parent_id`, `message_embeddings.message_id`
- Conversations indexed on `updated_at`
- Unique constraint `uq_message_embeddings_message_id` on `message_embeddings.message_id`

**Query patterns:**

- All routes use raw SQL via `AppDataSource.query()` (no TypeORM repositories) for performance
- Conversation detail uses single `LEFT JOIN` query returning denormalized rows
- Conversation list uses `LEFT JOIN ... GROUP BY` single query (no N+1)
- Embedding sync uses batch `INSERT ... ON CONFLICT (message_id) DO UPDATE` upsert
- Embedding suggestions use raw SQL with `pgvector <=>` L2 distance operator
- Message creation/update/delete use parameterized raw SQL with `RETURNING`

**Repository pattern:** Lazy-loaded proxies in `server/db/repositories.ts` for legacy compatibility — delegates to `AppDataSource.getRepository()` on first access.

### API Security

- Global `.onError()` handler hides stack traces from clients
- `/api/db-preview/*` gated behind `NODE_ENV !== 'production'`
- UUID format validation on all `:id` and `:conversationId` route parameters
- Connection pool: max 20, idle 10s, timeout 5s
- `synchronize: true` gated by `NODE_ENV !== 'production'`

### Skills

This project should use the following skills for optimal development:

| Skill                              | Trigger When                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `frontend-design`                  | Building or modifying UI components — production-grade design, responsive, animation               |
| `next-best-practices`              | Working with Next.js — file conventions, RSC boundaries, data patterns, async components           |
| `next-cache-components`            | Optimizing Next.js caching — PPR, cache directive, cacheLife, cacheTag, use cache                  |
| `elysia-js`                        | Adding or modifying API routes on the Elysia.js server                                             |
| `typescript-pro`                   | Advanced TypeScript types, generics, type guards, utility types                                    |
| `coding-standards`                 | Universal coding standards, best practices, patterns for TypeScript/JavaScript                     |
| `supabase-postgres-best-practices` | Database queries, indexing, schema design, performance optimization for PostgreSQL                 |
| `documentation-lookup`             | Looking up library/API docs for `@huggingface/transformers`, pgvector, WebGPU, TailwindCSS 4       |
| `fix`                              | Lint errors, formatting issues, or before committing code                                          |
| `ultrathink`                       | Complex architecture decisions, multi-system debugging, ambiguous problems requiring deep analysis |

## Development Workflow

### Agent-Driven Development Cycle

When developing features, follow this 5-phase cycle:

| Phase          | Trigger                                         | Tool                           | Agent/Skill                          |
| -------------- | ----------------------------------------------- | ------------------------------ | ------------------------------------ |
| **1. Plan**    | "plan feature X" / unclear requirements         | `Agent`                        | `Plan` subagent                      |
| **2. Code**    | Plan approved                                   | `Agent` (parallel specialists) | See Coding Specialist Agents below   |
| **3. Debug**   | "fix this" / test failure / unexpected behavior | `Agent`                        | `bug-reproduction-validator`         |
| **4. Review**  | After code written                              | `Agent` (parallel)             | `code-reviewer` + `security-auditor` |
| **5. Iterate** | Review feedback                                 | Main context                   | Direct edit, then re-review          |

### Coding Specialist Agents

Delegate to the right agent based on what layer is being touched:

| Layer                          | Agent                                       |
| ------------------------------ | ------------------------------------------- |
| Frontend UI / components       | `frontend-design`                           |
| TypeScript logic / types       | `javascript-typescript:typescript-pro`      |
| API routes (Elysia.js)         | `backend-development:api-design-principles` |
| Database / schema / migrations | `backend-development:architecture-patterns` |
| Tests                          | `backend-development:test-automator`        |
| Performance concerns           | `backend-development:performance-engineer`  |

### Review Gate (run in parallel after implementing)

1. `comprehensive-review:code-reviewer` — general quality, patterns, correctness
2. `security-scanning:security-auditor` — OWASP, secrets, injection, auth
3. `backend-development:performance-engineer` — only when touching DB queries or API paths

### Rules

- **TDD for business logic**: Write tests first, then implement. Use `backend-development:test-automator` for test creation.
- **Small PRs**: Max 400 lines changed per commit. Break large features into logical chunks.
- **Auto-review**: PostToolUse hooks auto-run `kieran-typescript-reviewer` after Write/Edit on `.ts`/`.tsx` files.
- **Fix before commit**: Run `fix` skill before committing — handles lint, format, dead code.
- **No silent failures**: All errors must be logged or re-thrown. Never `try/catch` with empty catch.
- **Verify in browser**: For UI changes, use `mcp__chrome-devtools__take_screenshot` to verify visual output.

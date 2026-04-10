# Composer - Agent Guidelines

## Build and Development

```bash
pnpm install        # Install dependencies
pnpm dev            # Dev server on http://localhost:3001 (Turbopack)
pnpm build          # Production build (also serves as the CI gate)
pnpm lint           # ESLint
```

There is no unit test runner configured. Treat `pnpm build` and `pnpm lint` as the minimum quality gates.

## Environment

Requires a `.env.local` with at least one of: `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY`. Never commit `.env` files or API keys.

## File Naming Conventions

- **Components**: PascalCase filenames (`AppShell.tsx`, `A2uiSurface.tsx`). Exception: shadcn/ui primitives in `src/components/ui/` use kebab-case (`button.tsx`, `resizable.tsx`).
- **Hooks and utilities**: camelCase (`useStreamingPlayer.ts`, `json-parser.ts`).
- **Route files**: Next.js App Router convention - `page.tsx`, `layout.tsx` inside route directories.
- **Context providers**: kebab-case with `-context` suffix (`widgets-context.tsx`, `catalog-context.tsx`).

## Architecture Notes

### App Router Structure (`src/app/`)

| Route | Purpose |
|-------|---------|
| `/` | Home page - AI widget creation prompt (`CreateWidget` component) |
| `/widget/[id]` | Widget editor with live preview, Monaco code editor, and data panel |
| `/gallery` | Gallery of saved widgets |
| `/theater` | Streaming scenario replay with JSONL wire inspection |
| `/icons` | Material Symbols icon browser |
| `/components` | Component reference page |
| `/api/copilotkit/[...slug]` | CopilotKit runtime API route (AI backend) |

### Key Modules

- **`src/lib/a2ui-v09-renderer/`** -- The React renderer for A2UI v0.9. `A2uiSurface.tsx` is the root; it renders a tree by resolving `DeferredChild` components that subscribe to individual component model changes via `useSyncExternalStore`. The `catalog/` directory contains built-in component implementations.

- **`src/app/api/copilotkit/a2ui-prompt-v09.ts`** -- The LLM system prompt. Contains the full A2UI v0.9 spec including component props, data binding, template iteration, formatting functions, and quality guidelines.

- **`src/contexts/`** -- React context for global state:
  - `WidgetsContext` -- CRUD operations for widgets, persisted in IndexedDB via localforage.

- **`src/components/layout/app-shell.tsx`** -- The root client component. Wraps the app in `CopilotKitProvider > WidgetsProvider`.

### Dependencies to Know

- **`@a2ui/web_core` (v0.9)** -- Provides `SurfaceModel`, `ComponentContext`, `ComponentModel`, `Catalog`, and the reactive data model.
- **CopilotKit (`@copilotkit/*`)** -- AI chat runtime, React hooks, and `CopilotKitProvider`.
- **Next.js 16** with App Router and Turbopack.
- **React 19** with `useSyncExternalStore` for granular subscriptions.
- **Monaco Editor** (`@monaco-editor/react`) for JSON code editing.
- **shadcn/ui** components in `src/components/ui/`.

### Common Patterns

- The renderer uses **flat component arrays** with string ID references (never nested JSX). The root component always has `id: "root"`.
- Data binding uses `{ path: "/some/path" }` objects. Relative paths (no leading slash) are used inside templates.
- The AI tool (`editWidget`) does full replacement of components and data -- no incremental merge.
- Widget state is optimistically updated in React state and then persisted asynchronously to IndexedDB.

## Commit Style

Short imperative subjects (e.g., "Add themed a2ui surface", "Fix gallery search filter"). Reference issues in the footer.

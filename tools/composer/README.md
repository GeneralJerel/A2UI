# A2UI Composer

The A2UI Composer is an interactive development tool for building, editing, and previewing [A2UI](../../README.md) widgets. It provides an AI-assisted authoring experience where you describe a widget in natural language and the Composer generates valid A2UI v0.9 JSON (components + data). You can then refine the widget through conversation, edit the JSON directly, and preview the rendered result in real time.

The Composer also includes a gallery for managing saved widgets, a theater for replaying streaming A2UI scenarios, and an icon browser for discovering Material Symbols.

## Features

- **Widget Editor** -- Split-pane editor with live preview, JSON code editing (Monaco), and a data panel for inspecting/modifying the data model.
- **AI Authoring** -- Describe a widget in plain language; the AI generates A2UI v0.9 JSON using the full component vocabulary (Card, Row, Column, Text, Image, Button, List, Tabs, Modal, and more).
- **Gallery** -- Browse, search, and manage all saved widgets. Widgets persist in browser storage (IndexedDB via localforage).
- **Theater** -- Replay recorded A2UI streaming scenarios chunk-by-chunk. Inspect JSONL wire data, lifecycle events, and the rendered output side by side. Supports variable playback speed and keyboard shortcuts.
- **Icon Browser** -- Search and preview Material Symbols icons available to the `Icon` component.

## Prerequisites

- **Node.js** 18+ (20 recommended)
- **pnpm** 9+

## Quick Start

```bash
pnpm install
pnpm dev
```

The dev server starts on **http://localhost:3001** (Turbopack).

## Environment Variables

Create a `.env.local` file in this directory:

```env
# One of the following is required for AI authoring:
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
# OR
GEMINI_API_KEY=your_key_here
# OR
OPENAI_API_KEY=your_key_here
```

The AI authoring feature requires at least one API key. The Composer works with either Google Gemini or OpenAI models.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3001 (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Architecture

```
src/
  app/                    # Next.js App Router routes
    page.tsx              # Home - AI widget creation prompt
    widget/[id]/          # Widget editor (code + preview + data)
    gallery/              # Saved widgets gallery
    theater/              # Streaming scenario replay
    icons/                # Material Symbols icon browser
    components/           # Component reference page
    api/copilotkit/       # CopilotKit API route (AI backend)
  components/
    editor/               # Widget editor panels (code, preview, data, header)
    gallery/              # Gallery UI
    layout/               # App shell, sidebar, navigation
    theater/              # Theater playback hooks and controls
    ui/                   # Shared UI primitives (shadcn/ui)
  contexts/
    widgets-context.tsx   # Widget CRUD state (IndexedDB persistence)
  lib/
    a2ui-v09-renderer/    # React renderer for A2UI v0.9 surfaces
      A2uiSurface.tsx     # Root surface component (deferred child resolution)
      adapter.tsx         # React component implementation adapter
      catalog/            # Built-in component catalog (Card, Row, Text, etc.)
    storage.ts            # IndexedDB persistence via localforage
    json-parser.ts        # JSON parsing utilities
```

**Key architectural decisions:**

- **CopilotKit integration** -- The AI backend runs through a CopilotKit runtime route (`/api/copilotkit`). The system prompt in `a2ui-prompt-v09.ts` encodes the full A2UI v0.9 spec, component vocabulary, and quality guidelines.
- **Reactive rendering** -- `A2uiSurface` uses `useSyncExternalStore` to subscribe to individual component changes on the `SurfaceModel`, enabling granular re-renders without re-rendering the entire tree.
- **Catalog-driven** -- The renderer and AI prompt use the built-in A2UI v0.9 basic catalog, which defines all standard components (Card, Row, Column, Text, Button, etc.).
- **Client-side persistence** -- Widgets are stored in IndexedDB (via localforage); catalog preferences are stored in localStorage. No server-side database is required.

## Contributing

See the repository-level [CONTRIBUTING.md](../../CONTRIBUTING.md).

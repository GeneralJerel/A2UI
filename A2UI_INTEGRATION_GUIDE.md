# A2UI Agent Integration Guide

How agents connect to A2UI — transports, SDKs, and per-framework integration paths.

> Sourced from the A2UI repo (`docs/concepts/transports.md`, `docs/roadmap.md`, `docs/guides/`, `agent_sdks/`, `samples/`) as of 2026-05-22.

---

## Mental model

A2UI is a **UI format** (a JSON envelope: `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`), **not a transport**. It rides on top of whichever wire protocol your agent already speaks. There are two layers:

- **Transports (the wire):** A2A, AG-UI, MCP, future REST/WS/SSE
- **Agent-side helpers (the emitter):** ADK toolset, AG2 `A2UIAgent`, plain Python/Kotlin SDK, CopilotKit's auto-injected `render_a2ui` tool

ADK and AG2 are **not transports** — they're agent frameworks whose SDK helpers emit A2UI over A2A or AG-UI underneath.

---

## Transport comparison

|  | **A2A** | **AG-UI (CopilotKit)** | **MCP** |
|---|---|---|---|
| **Status** | ✅ Stable | ✅ Stable | Guide-level / sample |
| **Streaming partial JSON** | Native (JSONL) | Native, auto-assembled | Tools = one-shot; resources via SSE |
| **Two-way data model (`sendDataModel`)** | Via A2A metadata, manual wiring | Automatic | Not built-in; manual JSON-RPC |
| **Action callbacks (UI → agent)** | A2A messages back | Automatic | Manual tool-call mapping |
| **Frontend coupling** | Any A2A-aware client | React/Next.js only | Any MCP client (Inspector, Claude desktop, custom) |
| **Multi-agent / multi-surface** | Native (`contextId`) | Per-runtime | Multiple servers fine |
| **Setup friction** | High (build the A2A pipe yourself) | Lowest (`a2ui: {injectA2UITool: true}`) | Medium (manual validation, manual UI return) |
| **Built-in validation** | Schema manager available, you wire it | Runtime-level | You must call `validator.validate(...)` |

### A2A — the canonical transport

**Pros**
- Only path with genuine multi-agent semantics (`contextId`, capabilities exchange, auth).
- Frontend-agnostic — renderer can be Lit, Angular, Flutter, native mobile, anything that consumes A2A `DataPart`s with MIME `application/json+a2ui`.
- `sendDataModel` round-trip is part of the spec.

**Cons**
- You build the pipe. The transports doc literally says "TODO: Add a detailed guide."
- Steepest ramp; you need to understand A2A's extension model before A2UI enters the picture.

### AG-UI via CopilotKit — the path of least resistance

**Pros**
- Backend is one flag in `CopilotRuntime`; frontend renderer auto-activates.
- Works under any agent framework CopilotKit supports — ADK, LangGraph, CrewAI, Mastra, custom.
- Bidirectional sync and action callbacks handled by the runtime.
- BYOC story is well-developed: Zod definitions + typed React renderers via `createCatalog`.

**Cons**
- **React/Next.js only.** Hard stop if you need Angular, Vue, vanilla web components, or mobile.
- CopilotKit dependency — you're adopting their runtime model.
- The agent emits via an injected tool, so debugging traces through CopilotKit's tool-injection layer.

### MCP — server-side embedding

**Pros**
- Genuinely framework-agnostic clients: MCP Inspector, Claude Desktop, custom Vite client (see `samples/mcp/a2ui-over-mcp-recipe/`).
- Great for "static surface + dynamic refinement" — serve the form as a resource, render details via a tool.
- Lighter than A2A; no auth/extension negotiation.

**Cons**
- Tools are one-shot. No incremental streaming UX without falling back to resource streaming over SSE.
- No built-in `sendDataModel`. Stateful forms get clunky.
- Validation is on you — easy to forget and ship broken JSON.

---

## Per-framework integration matrix

| Framework | Status | Method of connection | Pros | Cons |
|---|---|---|---|---|
| **AG2** | ✅ Complete | First-party `A2UIAgent` (subclass of `ConversableAgent`). Serves over A2A or AG-UI. | Native SDK — prompt engineering, schema validation, retry built in. Transport flexibility. Works with non-React clients (Flutter sample exists). | External to A2UI repo — lives in AG2's codebase. Locks you into AG2's multi-agent model. |
| **ADK** | 🚧 In progress | `SendA2uiToClientToolset` from `agent_sdks/python/src/a2ui/adk/`. Injects a `render_a2ui` tool; output wrapped as A2A `DataPart`. | Lowest-friction Python path. Validation + `PayloadFixer` for malformed LLM JSON. Works over A2A or AG-UI. | Status "designing developer ergonomics" — APIs may shift. Single-agent oriented. ADK-only. |
| **LangChain / LangGraph** | 💡 Proposed | No native SDK. Route through **CopilotKit runtime** → AG-UI → React. CopilotKit injects `render_a2ui` tool. | Works today via CopilotKit. No A2UI-specific code in your agent. Full streaming + bidirectional sync handled by runtime. | React/Next.js only. CopilotKit dependency. No first-party support yet. |
| **CrewAI** | 💡 Proposed | Same as LangGraph — CopilotKit + AG-UI. | CopilotKit already has a CrewAI adapter. Streaming + sync free. | React lock-in via CopilotKit. Crew multi-agent semantics don't map cleanly onto A2UI's single-surface model. |
| **Mastra** | 💡 Proposed | Same — CopilotKit + AG-UI. | Mastra is TS-native, slots into a Next.js stack cleanly. | Same React lock-in via CopilotKit. |
| **Genkit** | 💡 Proposed | No documented path. Could wrap as A2A server, or emit A2UI JSON via custom tool. | Google's own framework — likely first-class A2A support down the road. | Nothing shipped. DIY today. |
| **Claude Agent SDK** | 💡 Proposed | No documented path. Realistic options: (a) custom tool returning A2UI JSON, (b) wrap as MCP server (SDK already speaks MCP), (c) hand-roll AG-UI bridge. | MCP path is plausible — see `samples/mcp/a2ui-over-mcp-recipe/`. | No native integration. You're writing glue. |
| **OpenAI Agent SDK** | 💡 Proposed | No documented path. Wrap as A2A server, or wait for CopilotKit adapter. | OpenAI tool-calling JSON maps cleanly to `render_a2ui` shape. | No native integration. No CopilotKit adapter listed today. |
| **MS Agent Framework** | 💡 Proposed | No documented path. | — | Nothing shipped. |
| **AWS Strands** | 💡 Proposed | No documented path. | — | Nothing shipped. |
| **Plain Python / custom** | ✅ via A2A or AG-UI | Wrap as an A2A server (`agent_sdks/python/src/a2ui/a2a/`), wrap as a CopilotKit backend (AG-UI), or emit raw JSON over any transport (`application/json+a2ui`). | Maximum control. Transport-agnostic — works with any renderer. | You build everything: validation, streaming, data-model round-trip. No scaffolding. |
| **Any A2A-speaking agent** | ✅ Day-zero | A2A protocol with the A2UI extension. Each A2UI envelope = one A2A `DataPart`. | Universal — works with non-React clients (mobile, desktop). Multi-agent native. | Steepest learning curve. Transports doc still says "TODO." |
| **Any AG-UI-speaking agent** | ✅ Day-zero | AG-UI transport (typically via CopilotKit). | Easiest setup. Bidirectional sync + streaming handled automatically. | React/Next.js only. |

---

## When to pick which

- **You're on AG2:** use `A2UIAgent` — only "Complete" native integration.
- **You're on ADK:** use `SendA2uiToClientToolset` — best supported Python path.
- **You're on LangGraph / CrewAI / Mastra / OpenAI SDK / Claude SDK:** there's no native SDK. The realistic shipped path is **CopilotKit + AG-UI** (assuming a React frontend).
- **Non-React frontend (mobile, Angular, Lit, Flutter, desktop):** A2A — only stable transport that doesn't presuppose React.
- **Multi-agent mesh, enterprise auth:** A2A.
- **Tool/plugin ecosystem (Claude Desktop, MCP Inspector, sandboxed UIs):** MCP.
- **Stateful forms with two-way data sync:** A2A or AG-UI. Avoid MCP unless you enjoy hand-rolling the round-trip.

---

## Key file paths

- **A2A binding:** `agent_sdks/python/src/a2ui/a2a/parts.py`
- **ADK toolset:** `agent_sdks/python/src/a2ui/adk/send_a2ui_to_client_toolset.py`
- **ADK samples:** `samples/agent/adk/restaurant_finder/`, `samples/agent/adk/mcp_app_proxy/`
- **MCP sample:** `samples/mcp/a2ui-over-mcp-recipe/server.py`
- **MCP guide:** `docs/guides/a2ui_over_mcp.md`
- **AG-UI/CopilotKit guide:** `docs/guides/a2ui-with-any-agent-framework.md`
- **Protocol spec:** `specification/v0_10/docs/a2ui_protocol.md`
- **Transports doc:** `docs/concepts/transports.md`
- **Roadmap (framework status):** `docs/roadmap.md`
- **Ecosystem (AG2 etc.):** `docs/ecosystem/a2ui-in-the-world.md`

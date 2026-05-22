# A2UI Agent Integration: Detailed Technical Analysis

A deep dive into how A2UI agents actually wire up, what the SDK does under the hood, and where the transport choices overlap and compete.

> Based on the A2UI repo at `e405ae0` → `6fd71ab4` (synced from `google/A2UI` on 2026-05-22).

---

## 1. The mental model, sharpened

A2UI is a **declarative UI format**, not a transport. The protocol is just JSON envelopes — four message types — and the format is identical no matter which wire carries it:

| Message | Purpose |
|---|---|
| `createSurface` | Allocate a UI region with a `surfaceId`, `catalogId`, optional theme, optional `sendDataModel` flag. Immutable once created — to reconfigure you delete and recreate. |
| `updateComponents` | Flat adjacency-list of components for a surface. Children referenced by ID; client reconstructs the tree. **Must contain exactly one `id: "root"`** before rendering begins. |
| `updateDataModel` | Patch the data model at a JSON Pointer path (RFC 6901, extended to support relative paths for templated children). Omit path → root-level replacement. |
| `deleteSurface` | Remove a surface and all its components. |

The transport's job is to deliver these envelopes reliably, in order, with message framing. **JSONL is the reference format** — one JSON object per line.

The version split matters. **v0.8 was structured-output-first** (constrain the LLM via strict tool schemas). **v0.9 is prompt-first**: the catalog goes into the system prompt, the LLM emits free-form JSON, and the SDK validates + repairs the output. v0.9 trades LLM constraint for token efficiency and catalog flexibility, with the SDK's `PayloadFixer` + `A2uiValidator` carrying the correctness burden.

---

## 2. Transports, layer by layer

A2UI lists five transports as ✅ Complete in `docs/roadmap.md`: **A2A, AG UI, REST API, WebSockets, MCP**. Only A2A and AG-UI are documented in detail; REST/WS get a "TODO: Add an example" in `docs/concepts/transports.md`. The two real options today are A2A and AG-UI, with MCP as a secondary integration pattern.

### 2.1 A2A (Agent-to-Agent Protocol)

The native binding. Extension URI: `https://a2ui.org/a2a-extension/a2ui/v0.8`. Every A2UI envelope becomes one A2A `DataPart`:

```python
def create_a2ui_part(a2ui_data: dict[str, Any]) -> Part:
    return Part(
        root=DataPart(
            data=a2ui_data,
            metadata={"mimeType": "application/json+a2ui"}
        )
    )
```
*(`agent_sdks/python/src/a2ui/a2a/parts.py`)*

**Capability negotiation** happens through `AgentCard.capabilities.extensions`. The server advertises which catalogs it can produce; the client advertises which it can render plus any inline catalogs it wants to inject:

```json
{
  "uri": "https://a2ui.org/a2a-extension/a2ui/v0.8",
  "params": {
    "supportedCatalogIds": ["https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"],
    "acceptsInlineCatalogs": true
  }
}
```

**Bidirectional data flow** is built into A2A's metadata. When `createSurface` sets `sendDataModel: true`, the client appends `a2uiClientDataModel` (a `surfaceId → currentDataModel` map) to every message metadata it sends back. The agent receives the full UI state alongside user actions — no separate channel needed.

### 2.2 AG-UI (via CopilotKit)

AG-UI is CopilotKit's transport. The runtime auto-detects A2UI tool outputs and routes them to the React renderer. Backend surface:

```ts
const runtime = new CopilotRuntime({
  agents: {default: myAgent},
  a2ui: {injectA2UITool: true},  // injects render_a2ui into the agent
});
```

Frontend:

```tsx
<CopilotKitProvider runtimeUrl="/api/copilotkit" a2ui={{catalog: myCatalog}}>
  {children}
</CopilotKitProvider>
```

The runtime handles streaming reassembly, validation, and `sendDataModel` round-trip transparently — the agent author writes zero A2UI plumbing.

### 2.3 MCP (Model Context Protocol)

MCP carries A2UI two ways:

1. **Resources**: `mimeType: "application/json+a2ui"` on a resource URI. The client reads it like any MCP resource.
2. **Tools**: tool calls return `EmbeddedResource` with A2UI JSON payload.

```python
# samples/mcp/a2ui-over-mcp-recipe/server.py
A2UI_MIME_TYPE = "application/json+a2ui"

@app.read_resource()
async def read_resource(uri: str):
    if uri == "a2ui://recipe-form":
        return [ReadResourceContents(
            mime_type=A2UI_MIME_TYPE,
            content=json.dumps(recipe_form_json)
        )]
```

Resources can stream over SSE; tools are one-shot. There's **no built-in `sendDataModel` equivalent** — bidirectional state has to be hand-rolled as round-trip tool calls.

---

## 3. Agent SDK internals

The Python SDK (`agent_sdks/python/src/a2ui/`) does five things. Most agent integrations are thin shells over these layers.

### 3.1 Catalog management — `schema/manager.py`

`A2uiSchemaManager` loads JSON Schema catalogs (either from bundled `importlib.resources` or filesystem fallback), composes them into a single system prompt, and exposes a `validator` for runtime checks. It supports version-aware loading (v0.8 / v0.9) and dynamic component-list pruning to keep prompt tokens manageable for large catalogs.

### 3.2 Prompt injection

The catalog is rendered into the system prompt with structured tags:

```
<a2ui-json>
[{"createSurface": {...}}]
</a2ui-json>
```

Plus optional few-shot examples from the catalog's `examples/` directory. The `InferenceStrategy` abstract base lets you swap how the prompt is assembled.

### 3.3 Streaming parser — `parser/streaming.py`, `parser/streaming_v09.py`

A regex-based block extractor that buffers LLM text chunks and yields `ResponsePart` objects when complete `<a2ui-json>...</a2ui-json>` blocks arrive. It:

- Uses `re.DOTALL` to capture multi-line JSON.
- Strips markdown code fences (LLMs love to wrap JSON in ` ```json `).
- Clears processed content from the buffer so multi-block streams work.
- Alternates text parts and A2UI parts so the UI can show prose alongside surfaces.

### 3.4 Payload fixing + validation — `parser/payload_fixer.py`, `schema/validator.py`

`PayloadFixer` repairs common LLM mistakes: trailing commas, unquoted keys, unterminated brackets.

`A2uiValidator` does deep semantic validation:

- JSON Schema (Draft 2020-12)
- Unique component IDs, mandatory `root`
- Topology: no cycles, no orphans (reachability from root)
- Recursion limits: `MAX_GLOBAL_DEPTH = 50`, `MAX_FUNC_CALL_DEPTH = 5`
- JSON Pointer syntax (relaxed to support relative paths)

This is what separates "ship a real agent" from "demo on stage" — LLMs *will* produce broken JSON, and the fixer + validator is the safety net.

### 3.5 Tool integration — `adk/send_a2ui_to_client_toolset.py`

The ADK toolset exposes one tool to the LLM: `send_a2ui_json_to_client(a2ui_json: str)`. Internally:

1. Parse the JSON argument.
2. Validate against the catalog schema.
3. If invalid, return an error to the LLM (which retries — the prompt explains this loop).
4. If valid, pass to `A2uiEventConverter` which wraps as A2A `DataPart`s.

Dynamic providers let you flip `a2ui_enabled` and swap catalogs per request without rebuilding the agent.

---

## 4. Samples — what's actually shippable

| Sample | Lines | What it demonstrates |
|---|---|---|
| `samples/agent/adk/custom-components-example/` | ~552 | Inline catalog definition, simultaneous v0.8 + v0.9 schema management, custom component registration (`FloorPlanRenderer`). The reference for BYOC on the agent side. |
| `samples/agent/adk/restaurant_finder/` | ~400 | Real task agent: integrates A2UI surfaces with structured tool calls (lookup, filter). Shows the prompt→generate→validate loop in production shape. |
| `samples/agent/adk/personalized_learning/` | ~746 | Multi-surface orchestration: lesson plans, quizzes, progress tracking as separate surfaces with independent data models. Closest to a "real product" reference. |
| `samples/mcp/a2ui-over-mcp-recipe/` | — | Static form as MCP resource + dynamic recipe card as MCP tool. Includes a Vite client to prove it's framework-agnostic on the client side. |

---

## 5. Custom component catalogs (BYOC)

Two patterns, depending on which transport you're on.

**A2A / ADK path** — define the catalog as a JSON Schema file:

```json
// samples/agent/adk/custom-components-example/inline_catalog_0.9.json
{
  "FloorPlanRenderer": {
    "type": "object",
    "properties": {
      "rooms": { "$ref": "common_types.json#/$defs/ChildList" },
      "selectedRoom": { "$ref": "common_types.json#/$defs/ComponentId" }
    }
  }
}
```

The schema manager enforces the type discipline: `ComponentId` for single child refs, `ChildList` for arrays, raw strings only for static text (labels, URLs). Inline catalogs ride along in client capabilities; the agent targets them via `catalogId: "inline_catalog"`.

**AG-UI / CopilotKit path** — define with Zod, render with React, register through the provider:

```ts
// lib/a2ui/definitions.ts
export const myDefinitions = {
  StatusBadge: {
    description: 'A colored status badge.',  // → injected into LLM prompt
    props: z.object({
      text: z.string(),
      variant: z.enum(['success', 'warning', 'error']).optional(),
    }),
  },
};
```

```tsx
// lib/a2ui/renderers.tsx
const myCatalog = createCatalog<MyDefinitions>(myDefinitions, {
  StatusBadge: ({ text, variant }) => <Badge color={variant}>{text}</Badge>,
});
```

The TypeScript generics tie props to their Zod schema — a typo in `props.text` is a compile error. The `description` field is what the LLM sees in its prompt, so phrasing matters as much for usage frequency as it does for documentation.

---

## 6. Where A2A and AG-UI overlap (and yes, they compete)

This is the architectural question worth pulling on. Both A2A and AG-UI are listed as ✅ Complete transports for A2UI. They overlap because:

- Both deliver A2UI envelopes from agent to client.
- Both support streaming, bidirectional data flow, and capability negotiation.
- Both are positioned as "the universal way" to get A2UI in front of users.

The differences are about **design center**, not capability:

| Axis | A2A | AG-UI (CopilotKit) |
|---|---|---|
| Designed for | Agent ↔ agent (also agent ↔ client) | Agent ↔ frontend |
| Frontend assumption | None — any client that parses A2A | React/Next.js |
| Multi-agent semantics | Native (`contextId`, capabilities exchange, auth) | Per-runtime |
| State sync primitive | A2A message metadata (`a2uiClientDataModel`) | CopilotKit hooks / runtime |
| Ecosystem | Open standard (Google-led, multi-vendor) | CopilotKit company-led |
| Setup cost | High — you build the pipe | Lowest — one config flag |

**The honest take:** if an agent framework speaks A2A natively, going through CopilotKit/AG-UI to deliver A2UI is architectural detour, not necessity. The CopilotKit path exists because **most frameworks don't speak A2A yet**:

- ✅ AG2: native A2A (and AG-UI) via `A2UIAgent`
- 🚧 ADK: A2A binding in progress
- 💡 LangGraph, CrewAI, Mastra, OpenAI Agent SDK, Claude Agent SDK, MS Agent Framework, AWS Strands: **no native A2A** today

For those frameworks, CopilotKit is the practical bridge — they have AG-UI adapters even though they don't have A2A bindings. As more frameworks add A2A support, the dependency on CopilotKit erodes. AG2 already demonstrates the "both transports natively" pattern: an `A2UIAgent` instance can serve over A2A *or* AG-UI depending on deployment.

**Implication for picking:**

- If you want frontend portability (Flutter, Lit, Angular, mobile, desktop) → A2A. Period. AG-UI's React assumption is a hard wall.
- If you're on React/Next.js *and* your framework lacks A2A → AG-UI/CopilotKit is the only shipped path.
- If you're on React/Next.js *and* your framework has A2A (AG2 today, ADK soon) → it's a real choice. A2A buys you transport portability later; AG-UI buys you faster setup now and tighter React state integration via CopilotKit hooks.
- If you're building infra-level multi-agent systems → A2A. AG-UI doesn't have an answer for agent↔agent.

The roadmap signal is that A2A is positioned as **the** universal transport and AG-UI is positioned as **the recommended React path**. That's compatible coexistence on paper but competitive in practice — every framework that adds A2A reduces the reason to add CopilotKit.

---

## 7. Open gaps and risks

From `docs/roadmap.md`, `docs/concepts/transports.md`, and in-code TODOs:

- **A2A guide is TODO.** `docs/concepts/transports.md` line 40 says "TODO: Add a detailed guide." The transport is stable but the docs aren't — expect to read source.
- **REST / WebSockets / SSE samples are stubs.** All three list "✅ Complete" in the roadmap but have placeholder code blocks in the transports doc.
- **ADK ergonomics are still settling.** Roadmap line 48: "Still designing developer ergonomics." The toolset API may shift.
- **Mobile renderers are pre-2026 Q2.** SwiftUI and Jetpack Compose are "📋 Planned for Q2 2026." Flutter is the only mobile-capable renderer shipped.
- **Catalog discovery has no registry.** Catalogs are identified by URI but there's no central catalog index — every client/agent has to know the URIs out of band.
- **v0.10 is draft.** The current branch is on v0.9 with v0.10 in flight. Catalog file reorganization just landed (`specification/v0_9/catalogs/basic/catalog.json` moved out of `json/`).

---

## 8. Key file paths

```
agent_sdks/agent_sdk_guide.md                 # SDK architecture overview
agent_sdks/python/src/a2ui/a2a/parts.py       # A2A binding
agent_sdks/python/src/a2ui/adk/send_a2ui_to_client_toolset.py  # ADK toolset
agent_sdks/python/src/a2ui/parser/streaming.py  # streaming JSON extractor
agent_sdks/python/src/a2ui/parser/payload_fixer.py  # LLM JSON repair
agent_sdks/python/src/a2ui/schema/manager.py  # catalog + prompt composer
agent_sdks/python/src/a2ui/schema/validator.py  # deep validation
specification/v0_9/docs/a2ui_protocol.md       # protocol spec
specification/v0_8/docs/a2ui_extension_specification.md  # A2A extension
docs/concepts/transports.md                   # transport overview
docs/roadmap.md                               # status table
docs/guides/a2ui-with-any-agent-framework.md  # CopilotKit guide
docs/guides/a2ui_over_mcp.md                  # MCP guide
docs/guides/defining-your-own-catalog.md      # BYOC guide
samples/agent/adk/                            # ADK samples
samples/mcp/a2ui-over-mcp-recipe/             # MCP sample
```

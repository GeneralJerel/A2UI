# Proposal: AG-UI as the Default A2UI Transport

**To:** A2UI maintainers, Google
**From:** CopilotKit team
**Re:** Positioning AG-UI as the recommended default transport for A2UI moving forward

---

## TL;DR

A2UI is a UI format; it succeeds only when developers can put a surface on screen quickly. AG-UI delivers that in a single config flag against any agent framework, today. A2A is the right *protocol* substrate for the long-term agent mesh, but it is not the right *default developer entry point* for A2UI in the next 12–18 months. Making AG-UI the recommended default would accelerate A2UI adoption without compromising A2A's strategic role — the two are complementary, not competing.

This proposal argues for a concrete, low-cost positioning change in the docs and onboarding flow. A2A remains a first-class, documented, supported transport.

---

## 1. Why this matters now

A2UI is in the adoption window where defaults become norms. The current docs already lean this direction (`docs/concepts/transports.md` calls AG-UI "the recommended transport for React / Next.js clients") but the roadmap and quickstarts still present A2A and AG-UI as peers, and the A2A guide is explicitly `TODO: Add a detailed guide`. Developers reading the repo today are choosing — and they're choosing based on which path has shipped docs, samples, and a one-flag setup. That choice is being made *now*.

Every month A2UI ships without a confidently-recommended default is a month where the comparison sites, blog posts, and YouTube tutorials get written against an ambiguous story. The window to set the default narrative closes fast.

---

## 2. The case for AG-UI as default

### 2.1 Time-to-first-surface is the adoption metric that matters

AG-UI ships A2UI in two artifacts:

```ts
// Backend
const runtime = new CopilotRuntime({
  agents: {default: myAgent},
  a2ui: {injectA2UITool: true},
});
```

```tsx
// Frontend
<CopilotKitProvider runtimeUrl="/api/copilotkit" a2ui={{catalog: myCatalog}}>
  {children}
</CopilotKitProvider>
```

That's it. Streaming, validation, `sendDataModel` round-trip, action callbacks, and renderer activation are handled by the runtime. The equivalent on A2A today requires building the A2A server, wiring the extension, implementing capability negotiation, parsing `DataPart`s on the client, and dispatching actions back — and the integration guide is still `TODO`.

The fastest reference implementation wins the developer survey. AG-UI is that implementation today.

### 2.2 Framework neutrality is already solved on the AG-UI side

The recurring question is "how do I use A2UI with my agent framework?" Per the roadmap, native A2A integrations exist for:

- ✅ AG2
- 🚧 ADK (in progress)

Everything else — LangGraph, CrewAI, Mastra, OpenAI Agent SDK, Claude Agent SDK, Microsoft Agent Framework, AWS Strands — is "💡 Proposed / community interest" with no committed timeline. Building A2A bindings for each of these is a multi-quarter effort *per framework*.

CopilotKit already has AG-UI adapters for those frameworks. A2UI on AG-UI works with them *today*, with zero A2UI-specific work in the agent framework itself — the runtime injects the tool. That delivers framework coverage in months that A2A would deliver in years.

### 2.3 Where users actually are: React/Next.js

The "A2A wins on frontend portability" argument is real but quantitatively narrow in 2026. Look at the renderer roadmap:

- ✅ Stable: Web Core, Lit, Angular, Flutter, **React**
- 📋 Planned Q2 2026: SwiftUI, Jetpack Compose
- 💡 Proposed: Vue, Svelte, ShadCN

For at least the next year, the dominant A2UI surface area will be web. Inside web, React is the majority stack for new agent UIs. Optimizing the default path for where 70–80% of new builds will live is the right call. Non-React paths stay supported via A2A — they don't become impossible, they just stop being the default narrative.

### 2.4 The BYOC developer experience favors AG-UI

Custom component catalogs are how A2UI grows beyond demos. Compare the two paths:

**A2A path** — author a JSON Schema file:
```json
{
  "FloorPlanRenderer": {
    "properties": {
      "rooms": { "$ref": "common_types.json#/$defs/ChildList" },
      "selectedRoom": { "$ref": "common_types.json#/$defs/ComponentId" }
    }
  }
}
```
Then implement the renderer separately, validated only at runtime against the catalog.

**AG-UI path** — Zod definitions + typed React renderers:
```ts
export const myDefinitions = {
  StatusBadge: {
    description: 'A colored status badge.',
    props: z.object({
      text: z.string(),
      variant: z.enum(['success', 'warning', 'error']).optional(),
    }),
  },
};
```
```tsx
const myCatalog = createCatalog<MyDefinitions>(myDefinitions, {
  StatusBadge: ({ text, variant }) => <Badge color={variant}>{text}</Badge>,
});
```

The TypeScript generics tie renderer props to their Zod schema. A typo in `props.text` is a compile error. The `description` field doubles as the LLM prompt fragment and the design-system doc string. This is the BYOC experience that gets internal design system teams to adopt A2UI — they get IDE autocomplete, type safety, and the existing React component library wrapped, not rewritten.

### 2.5 The runtime absorbs the hardest parts of the spec

Three things tend to break A2UI integrations in practice:

1. **LLM output repair.** `PayloadFixer` for trailing commas, unquoted keys, unterminated brackets.
2. **Streaming reassembly.** Partial JSON, `<a2ui-json>` block extraction, markdown fence stripping.
3. **Bidirectional sync.** `sendDataModel` round-trip plumbed through every message in both directions.

CopilotKit's runtime handles all three transparently. A2A puts the burden on each integrator. For a first-time A2UI developer, this is the difference between "it worked in 10 minutes" and "I spent a day debugging why my data model isn't syncing." Adoption depends on the first experience, not the steady-state experience.

### 2.6 Iteration speed favors a reference implementation over a spec extension

A2UI is still pre-1.0 (v0.10 draft, v1.0 in progress). New features will land. Shipping them through a vendor runtime is faster than coordinating extension updates across an open protocol — the spec can lag the runtime, and the runtime can lead. As A2UI evolves, AG-UI gives the maintainers a fast experimentation lane.

---

## 3. What "default" actually means in this proposal

We are *not* asking for:
- A2A to be deprecated, removed, or downgraded.
- A2UI to depend on CopilotKit.
- A2UI's specification to change.

We *are* asking for these concrete positioning changes:

| Surface | Today | Proposed |
|---|---|---|
| `README.md` quickstart | Generic transport mention | "Get started with CopilotKit + AG-UI" with the two snippets above; "For advanced cases (multi-agent, non-React) see A2A" |
| `docs/concepts/transports.md` | A2A and AG-UI listed as peers | AG-UI presented as the default; A2A presented as the protocol substrate for advanced cases (multi-agent, non-React, enterprise mesh) |
| `docs/roadmap.md` framework table | Most frameworks "💡 Proposed" with no path | Mark frameworks as ✅ Complete *via CopilotKit + AG-UI* (which is already true) — separate columns for native A2A vs. AG-UI-bridged support |
| Sample priority | Mixed | AG-UI quickstart sample is the first hit. Mobile/multi-agent A2A samples remain prominent in their own section |
| `docs/guides/agent-development.md` | Generic | Defaults to AG-UI path with a clear sidebar to the A2A path |

The result: developers get a clear default; A2A retains its identity as the lower-level standard for advanced and multi-agent use cases.

---

## 4. Addressing the obvious counter-arguments

**"Making AG-UI the default ties A2UI to one company."**
Real concern. Mitigations we propose:
- Continue to spec A2UI independently of CopilotKit's implementation.
- The AG-UI protocol itself is open and documented at ag-ui.com; alternative AG-UI implementations are possible and we'd welcome them.
- The repo's existing dual-track approach (spec + reference implementations) is exactly how this should work — one company can run the reference frontend implementation without controlling the standard, the same way one company runs the reference compiler for many languages.

**"A2A is Google's strategic agent protocol — defaulting away from it undermines that bet."**
The opposite case is stronger: A2A wins as the *agent mesh* protocol when individual agents are valuable enough to mesh. A2UI is one of the things that makes individual agents valuable (they can render UIs). The fastest path to lots of A2UI agents is also the fastest path to a vibrant A2A mesh. AG-UI as the A2UI default does not compete with A2A's role — it accelerates the ecosystem A2A wants to mesh.

**"React lock-in is a real limitation."**
It is. The proposal explicitly keeps A2A as the recommended path for non-React clients (Flutter, Lit, Angular, mobile, desktop). The default is for the majority case; the exception is documented and supported.

**"Why not just improve the A2A docs and onboarding?"**
We'd support that too — A2A's docs *should* improve regardless. But the gap is not just docs. A2A inherently requires more glue (capability negotiation, auth, server scaffolding) before a first surface renders. The minimum-viable A2A integration is structurally larger than the minimum-viable AG-UI integration. That gap is intrinsic to the design centers, not a docs problem.

---

## 5. What CopilotKit will commit to

To make this proposal credible and not a vendor land-grab, CopilotKit will:

1. **Keep the AG-UI protocol open.** Spec maintained at ag-ui.com; alternative implementations welcomed.
2. **Contribute to A2UI's framework-neutrality.** We'll continue to publish AG-UI adapters for non-CopilotKit-native frameworks as they're requested.
3. **Sync release cadence with A2UI versions.** When A2UI ships v0.10 / v1.0, CopilotKit will support the new envelope shapes within a published SLA.
4. **Maintain a clean separation between A2UI catalog APIs and CopilotKit-specific APIs** so that a developer's catalog definitions are portable to other AG-UI implementations.
5. **Co-own quickstart docs in the A2UI repo** rather than redirecting to CopilotKit docs. The default story should live in `google/A2UI`.

---

## 6. The ask

A two-week joint working session between the A2UI maintainers and CopilotKit to:

1. Reorder the quickstart in `README.md` and `docs/concepts/transports.md` to recommend AG-UI as the default.
2. Update `docs/roadmap.md` framework support table to reflect AG-UI-bridged support for LangGraph / CrewAI / Mastra / OpenAI SDK / Claude SDK / etc. — which is already true today.
3. Land a one-page "Choosing a transport" doc that frames AG-UI (default) and A2A (advanced / multi-agent / non-React) as complementary, not competing.
4. Co-author a launch post positioning A2UI 1.0 around the AG-UI default + A2A advanced story.

Net result: developers get a confident default, A2A retains its strategic identity, and A2UI gets the adoption velocity that the format deserves.

---

## Appendix: Evidence summary

| Claim | Source |
|---|---|
| AG-UI = ✅ Complete, day-zero | `docs/roadmap.md` |
| A2A integration guide is incomplete | `docs/concepts/transports.md` line 40: "TODO: Add a detailed guide" |
| Only AG2 has native A2A; ADK in progress; others proposed | `docs/roadmap.md` framework support table |
| AG-UI works with any CopilotKit-supported framework | `docs/guides/a2ui-with-any-agent-framework.md` |
| One-flag backend setup | Same guide, lines 35–43 |
| Zod + React BYOC pattern | Same guide, lines 75–160 |
| Runtime handles validation, streaming, bidirectional sync | Same guide + `agent_sdks/python/src/a2ui/parser/` |
| Mobile renderers not stable until Q2 2026 | `docs/roadmap.md` client libraries table |

# Changelog

## [Unreleased]

### Added
- **Composer**: Production-quality upgrade of the A2UI Composer tool (building on #987). Adds a split-pane widget editor with Monaco code editing and live preview, AI-assisted widget authoring via natural language using the full A2UI v0.9 component vocabulary, a widget gallery with IndexedDB persistence, a streaming theater for replaying A2UI scenarios with JSONL wire inspection, and a Material Symbols icon browser. The Composer now uses a reactive rendering architecture (`useSyncExternalStore`-based `A2uiSurface`) and catalog-driven AI prompting where the built-in component catalog shapes both the renderer and the LLM system prompt.

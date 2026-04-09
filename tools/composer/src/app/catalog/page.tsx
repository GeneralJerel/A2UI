'use client';

import { useState, useCallback, useRef } from 'react';
import {
  CopilotChat,
  JsonSerializable,
  useAgent,
  useAgentContext,
  useCopilotKit,
  useFrontendTool,
} from '@copilotkit/react-core/v2';
import { z } from 'zod';
import { useCatalog } from '@/contexts/catalog-context';
import { A2UIViewer } from '@/lib/a2ui';
import { parseRobustJSON } from '@/lib/json-parser';
import {
  buildCustomCatalog,
  buildComponentSummary,
  EXAMPLE_CATALOG_JSON,
  type CustomComponentDef,
  type CustomPropDef,
} from '@/lib/custom-catalog';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ComponentDefEditor({
  def,
  onChange,
  onRemove,
}: {
  def: CustomComponentDef;
  onChange: (updated: CustomComponentDef) => void;
  onRemove: () => void;
}) {
  const updateProp = (propName: string, field: string, value: string) => {
    onChange({
      ...def,
      props: {
        ...def.props,
        [propName]: { ...def.props[propName], [field]: value },
      },
    });
  };

  const addProp = () => {
    const name = `prop${Object.keys(def.props).length + 1}`;
    onChange({
      ...def,
      props: { ...def.props, [name]: { type: 'string' as const, description: '' } },
    });
  };

  const removeProp = (propName: string) => {
    const { [propName]: _, ...rest } = def.props;
    onChange({ ...def, props: rest });
  };

  const renameProp = (oldName: string, newName: string) => {
    if (newName === oldName || !newName.trim()) return;
    const entries = Object.entries(def.props).map(([k, v]) =>
      k === oldName ? [newName, v] : [k, v]
    );
    onChange({ ...def, props: Object.fromEntries(entries) });
  };

  return (
    <div className="border border-border rounded-lg bg-white p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <input
            className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-foreground outline-none w-full"
            value={def.name}
            onChange={(e) => onChange({ ...def, name: e.target.value })}
            placeholder="ComponentName"
          />
          <input
            className="text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-foreground outline-none w-full"
            value={def.description ?? ''}
            onChange={(e) => onChange({ ...def, description: e.target.value })}
            placeholder="Component description..."
          />
        </div>
        <button
          onClick={onRemove}
          className="ml-2 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
        >
          Remove
        </button>
      </div>

      {/* Child/Children toggles */}
      <div className="flex gap-4 mb-3 text-xs">
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <input
            type="checkbox"
            checked={!!def.hasChild}
            onChange={(e) => onChange({ ...def, hasChild: e.target.checked })}
            className="rounded"
          />
          Has child (single)
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <input
            type="checkbox"
            checked={!!def.hasChildren}
            onChange={(e) => onChange({ ...def, hasChildren: e.target.checked })}
            className="rounded"
          />
          Has children (array)
        </label>
      </div>

      {/* Props table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-neutral-50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-36">Prop</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Type</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(def.props).map(([propName, propDef]) => (
              <tr key={propName} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  <input
                    className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-foreground outline-none w-full font-mono"
                    value={propName}
                    onChange={(e) => renameProp(propName, e.target.value)}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <select
                    className="text-sm bg-transparent outline-none cursor-pointer"
                    value={propDef.type}
                    onChange={(e) => updateProp(propName, 'type', e.target.value)}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="array">array</option>
                    <option value="object">object</option>
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-foreground outline-none w-full"
                    value={propDef.description ?? ''}
                    onChange={(e) => updateProp(propName, 'description', e.target.value)}
                    placeholder="Description..."
                  />
                </td>
                <td className="px-1">
                  <button
                    onClick={() => removeProp(propName)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Remove prop"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addProp}
        className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add prop
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview panel for testing widgets with the custom catalog
// ---------------------------------------------------------------------------

interface PreviewWidget {
  components: Array<{ id: string; component: string; [key: string]: unknown }>;
  data: Record<string, unknown>;
}

function CatalogPreview({
  preview,
  componentDefs,
}: {
  preview: PreviewWidget | null;
  componentDefs: CustomComponentDef[];
}) {
  // Build a fresh catalog from current editor state so preview always
  // reflects what's in the editor — even before Save is clicked.
  const catalog = componentDefs.length > 0
    ? buildCustomCatalog('preview-' + componentDefs.map(d => d.name).join('-'), componentDefs)
    : null;

  if (!preview) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
        Ask the agent to create a sample widget to preview it here
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
        Add components to your catalog first
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full">
      <A2UIViewer
        root="root"
        components={preview.components}
        data={preview.data}
        catalog={catalog}
        onAction={(action) => console.log('Preview action:', action)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const CATALOG_THREAD_ID = 'catalog-agent';

const DEFAULT_RENDERER_CODE = `// Example React renderers for custom components.
// These are saved for reference. The preview uses generic renderers.

import React from 'react';

export function BarChart({ title, description, data }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
      <h3>{title}</h3>
      <p>{description}</p>
      {/* Render your chart here */}
    </div>
  );
}
`;

export default function CatalogPage() {
  const { activeCatalog, setCustomCatalog, resetToBasic } = useCatalog();

  const [componentDefs, setComponentDefs] = useState<CustomComponentDef[]>(
    () => {
      if (!activeCatalog.isBasic && activeCatalog.definitionSource) {
        try {
          return JSON.parse(activeCatalog.definitionSource) as CustomComponentDef[];
        } catch {
          // fall through
        }
      }
      return EXAMPLE_CATALOG_JSON;
    }
  );
  const [rendererCode, setRendererCode] = useState(
    activeCatalog.rendererSource ?? DEFAULT_RENDERER_CODE
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [previewWidget, setPreviewWidget] = useState<PreviewWidget | null>(null);

  // Refs for tool handlers to access latest state without stale closures
  const componentDefsRef = useRef(componentDefs);
  componentDefsRef.current = componentDefs;

  const updateDef = useCallback((index: number, updated: CustomComponentDef) => {
    setComponentDefs((prev) => prev.map((d, i) => (i === index ? updated : d)));
    setSaveStatus('idle');
  }, []);

  const removeDef = useCallback((index: number) => {
    setComponentDefs((prev) => prev.filter((_, i) => i !== index));
    setSaveStatus('idle');
  }, []);

  const addComponent = useCallback(() => {
    setComponentDefs((prev) => [
      ...prev,
      {
        name: `Component${prev.length + 1}`,
        description: '',
        props: {
          label: { type: 'string' as const, description: 'Display label' },
        },
      },
    ]);
    setSaveStatus('idle');
  }, []);

  // Save catalog (also called by the agent tool)
  const doSave = useCallback((defs: CustomComponentDef[], renderer?: string) => {
    if (defs.length === 0) return false;
    const names = defs.map((d) => d.name.trim());
    if (names.some((n) => !n) || new Set(names).size !== names.length) return false;

    const catalogId = 'user-custom-' + Date.now();
    const catalog = buildCustomCatalog(catalogId, defs);
    const componentSummary = buildComponentSummary(defs);

    setCustomCatalog({
      catalog,
      label: 'Custom Catalog',
      componentSummary,
      definitionSource: JSON.stringify(defs, null, 2),
      rendererSource: renderer ?? rendererCode,
    });
    return true;
  }, [rendererCode, setCustomCatalog]);

  const handleSave = useCallback(() => {
    try {
      const ok = doSave(componentDefs);
      setSaveStatus(ok ? 'saved' : 'error');
      if (ok) setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to build custom catalog:', err);
      setSaveStatus('error');
    }
  }, [componentDefs, doSave]);

  const handleReset = useCallback(() => {
    resetToBasic();
    setComponentDefs(EXAMPLE_CATALOG_JSON);
    setRendererCode(DEFAULT_RENDERER_CODE);
    setPreviewWidget(null);
    setSaveStatus('idle');
  }, [resetToBasic]);

  const handleLoadExample = useCallback(() => {
    setComponentDefs(EXAMPLE_CATALOG_JSON);
    setSaveStatus('idle');
  }, []);

  // ---------------------------------------------------------------------------
  // CopilotKit agent context & tools
  // ---------------------------------------------------------------------------

  // Inject instructions for catalog mode
  useAgentContext({
    description: `You are helping the user design a custom A2UI component catalog. You have two tools:

1. **updateCatalog** — Replace the entire catalog with a new set of component definitions. Each component has: name, description, hasChild (optional bool), hasChildren (optional bool), props (object mapping prop names to {type, description}).
   Valid prop types: "string", "number", "boolean", "array", "object".

2. **previewWidget** — Create a sample A2UI widget using the current catalog components to test them. Components are a flat array with id, component (type name), and props. One must have id "root". Data is an optional JSON object for data bindings using {path: "/key"}.

When the user asks for components, use updateCatalog to define them. Then use previewWidget to show a sample widget demonstrating the components. Always preview after updating.

A2UI components are flat (referenced by ID, not nested). Container components use "child" (single ID) or "children" (array of IDs) to reference other components.`,
    value: { mode: 'catalog-editor' } as unknown as JsonSerializable,
  });

  // Inject current catalog state so the agent knows what's defined
  useAgentContext({
    description: 'The current custom component catalog definitions. This is what the user has defined so far.',
    value: componentDefs as unknown as JsonSerializable,
  });

  // Tool: update the entire catalog
  useFrontendTool({
    name: 'updateCatalog',
    description:
      'Replace the entire custom component catalog with new component definitions. Use this to add, remove, or modify components. Pass a JSON string of an array of component definitions.',
    parameters: z.object({
      components: z.string().describe(
        'JSON string of an array of component definitions. Each has: name (string), description (string), hasChild (boolean, optional), hasChildren (boolean, optional), props (object mapping prop names to {type: "string"|"number"|"boolean"|"array"|"object", description: string}).'
      ),
    }),
    render: ({ args, status }) => {
      const isBuilding = status !== 'complete';
      return (
        <details className="my-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1">
            {isBuilding ? (
              <span className="animate-pulse">Updating catalog...</span>
            ) : (
              <span>Catalog updated</span>
            )}
          </summary>
          <pre className="mt-1 text-xs bg-card border border-border rounded-lg p-3 overflow-auto max-h-40 font-mono text-card-foreground">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      );
    },
    handler: async ({ components: componentsJson }) => {
      try {
        const defs = parseRobustJSON(componentsJson) as CustomComponentDef[];
        if (!Array.isArray(defs) || defs.length === 0) {
          return { success: false, error: 'Expected a non-empty array of component definitions' };
        }
        // Validate shape
        for (const def of defs) {
          if (!def.name || typeof def.name !== 'string') {
            return { success: false, error: `Component missing "name": ${JSON.stringify(def)}` };
          }
          if (!def.props || typeof def.props !== 'object') {
            def.props = {};
          }
          // Normalize prop types
          for (const [, prop] of Object.entries(def.props)) {
            const p = prop as CustomPropDef;
            if (!['string', 'number', 'boolean', 'array', 'object'].includes(p.type)) {
              p.type = 'string';
            }
          }
        }

        setComponentDefs(defs);
        const ok = doSave(defs);
        if (!ok) {
          return { success: false, error: 'Validation failed — check component names are unique and non-empty' };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);

        return {
          success: true,
          componentCount: defs.length,
          components: defs.map((d) => d.name),
        };
      } catch (error) {
        return { success: false, error: `Invalid JSON: ${error}` };
      }
    },
  });

  // Tool: preview a sample widget using the current custom catalog
  useFrontendTool({
    name: 'previewWidget',
    description:
      'Preview a sample A2UI widget using the current custom catalog. Use this to demonstrate and test the catalog components. The widget appears in the preview panel.',
    parameters: z.object({
      components: z.string().describe(
        'JSON string of the A2UI components array. Each has: id (string), component (string — must match a catalog component name), plus component-specific props. One component must have id "root".'
      ),
      data: z.string().optional().describe(
        'JSON string of the data object for data bindings. Optional.'
      ),
    }),
    render: ({ args, status }) => {
      const isBuilding = status !== 'complete';
      return (
        <details className="my-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1">
            {isBuilding ? (
              <span className="animate-pulse">Building preview...</span>
            ) : (
              <span>Preview generated</span>
            )}
          </summary>
          <pre className="mt-1 text-xs bg-card border border-border rounded-lg p-3 overflow-auto max-h-40 font-mono text-card-foreground">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      );
    },
    handler: async ({ components: componentsJson, data: dataJson }) => {
      try {
        const components = parseRobustJSON(componentsJson) as PreviewWidget['components'];
        const data = dataJson ? (parseRobustJSON(dataJson) as Record<string, unknown>) : {};

        if (!Array.isArray(components) || components.length === 0) {
          return { success: false, error: 'Expected a non-empty array of components' };
        }
        if (!components.some((c) => c.id === 'root')) {
          return { success: false, error: 'Components must include one with id "root"' };
        }

        // Auto-save the catalog so it's active for the preview and widget editor
        const currentDefs = componentDefsRef.current;
        if (currentDefs.length > 0) {
          doSave(currentDefs);
        }

        setPreviewWidget({ components, data });

        return {
          success: true,
          componentCount: components.length,
          hasData: Object.keys(data).length > 0,
        };
      } catch (error) {
        return { success: false, error: `Invalid JSON: ${error}` };
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full gap-2">
      {/* Left: Catalog editor */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-white/50 shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Custom Catalog</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCatalog.isBasic
                ? 'Define your own component catalog.'
                : `Active: ${activeCatalog.label} (${componentDefs.length} components)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!activeCatalog.isBasic && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Reset to Basic
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
            >
              {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
            </button>
          </div>
        </div>

        {/* Two-panel: component list + preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Component definitions list */}
          <div className="flex-1 overflow-auto p-4">
            {componentDefs.map((def, i) => (
              <ComponentDefEditor
                key={`${def.name}-${i}`}
                def={def}
                onChange={(updated) => updateDef(i, updated)}
                onRemove={() => removeDef(i)}
              />
            ))}
            <div className="flex gap-2">
              <button
                onClick={addComponent}
                className="px-3 py-1.5 text-xs border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                + Add Component
              </button>
              {componentDefs.length === 0 && (
                <button
                  onClick={handleLoadExample}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Load Example
                </button>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div className="w-[320px] shrink-0 border-l border-border bg-neutral-50 flex flex-col">
            <div className="px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground bg-white/50">
              Preview
            </div>
            <CatalogPreview preview={previewWidget} componentDefs={componentDefs} />
          </div>
        </div>
      </div>

      {/* Right: Chat panel */}
      <div className="w-[380px] shrink-0 border-2 border-white bg-white rounded-lg overflow-hidden">
        <CopilotChat
          threadId={CATALOG_THREAD_ID}
          className="h-full"
          feather={{ className: 'right-0' }}
          inputProps={{
            className: 'border shadow-sm bg-white/50',
            sendButton: {
              className:
                'enabled:bg-gradient-to-br enabled:from-violet-500 enabled:to-indigo-600 enabled:hover:from-violet-600 enabled:hover:to-indigo-700 enabled:border-0',
            },
          }}
          disclaimer={() => (
            <div className="text-center text-xs text-muted-foreground py-2">
              Describe your catalog or ask to preview a widget
            </div>
          )}
        />
      </div>
    </div>
  );
}

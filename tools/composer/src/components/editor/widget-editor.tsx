"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  CopilotChat,
  JsonSerializable,
  useAgent,
  useAgentContext,
  useCopilotKit,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { z } from "zod";
import { parseRobustJSON } from "@/lib/json-parser";
import { useCatalog } from "@/contexts/catalog-context";
import { EditorHeader } from "./editor-header";
import { CodeEditor } from "./code-editor";
import { PreviewPane } from "./preview-pane";
import { DataPanel } from "./data-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { GALLERY_WIDGETS } from "@/data/gallery";
import { useWidgets } from "@/contexts/widgets-context";
import type { Widget, DataState } from "@/types/widget";
import type { A2UIComponent } from "@/types/widget";

interface WidgetEditorProps {
  widget: Widget;
  initialPrompt?: string;
}

export function WidgetEditor({ widget, initialPrompt }: WidgetEditorProps) {
  const { updateWidget } = useWidgets();
  const { activeCatalog } = useCatalog();
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const hasAutoSent = useRef(false);

  // Local state for components (JSON string for editor)
  const [componentsJson, setComponentsJson] = useState(() =>
    JSON.stringify(widget.components, null, 2),
  );

  // Local state for dataStates
  const [dataStates, setDataStates] = useState<DataState[]>(widget.dataStates);
  const [activeDataStateIndex, setActiveDataStateIndex] = useState(0);

  // Parsed components for preview (null if invalid JSON)
  const [components, setComponents] = useState<A2UIComponent[]>(
    widget.components,
  );

  const handleComponentsChange = useCallback(
    (json: string) => {
      setComponentsJson(json);
      try {
        const parsed = JSON.parse(json) as A2UIComponent[];
        setComponents(parsed);
        updateWidget(widget.id, { components: parsed });
      } catch {
        // Invalid JSON, don't update
      }
    },
    [widget.id, updateWidget],
  );

  const handleDataStatesChange = useCallback(
    (newDataStates: DataState[]) => {
      setDataStates(newDataStates);
      updateWidget(widget.id, { dataStates: newDataStates });
    },
    [widget.id, updateWidget],
  );

  const handleAddDataState = useCallback(() => {
    const newState: DataState = {
      name: `state-${dataStates.length + 1}`,
      data: dataStates[0]?.data ? { ...dataStates[0].data } : {},
    };
    const newDataStates = [...dataStates, newState];
    handleDataStatesChange(newDataStates);
    setActiveDataStateIndex(newDataStates.length - 1);
  }, [dataStates, handleDataStatesChange]);

  const handleUpdateDataState = useCallback(
    (index: number, data: Record<string, unknown>) => {
      const newDataStates = dataStates.map((ds, i) =>
        i === index ? { ...ds, data } : ds,
      );
      handleDataStatesChange(newDataStates);
    },
    [dataStates, handleDataStatesChange],
  );

  const handleRenameDataState = useCallback(
    (index: number, name: string) => {
      const newDataStates = dataStates.map((ds, i) =>
        i === index ? { ...ds, name } : ds,
      );
      handleDataStatesChange(newDataStates);
    },
    [dataStates, handleDataStatesChange],
  );

  const handleDeleteDataState = useCallback(
    (index: number) => {
      if (dataStates.length <= 1) return; // Keep at least one state
      const newDataStates = dataStates.filter((_, i) => i !== index);
      handleDataStatesChange(newDataStates);
      if (activeDataStateIndex >= newDataStates.length) {
        setActiveDataStateIndex(newDataStates.length - 1);
      }
    },
    [dataStates, activeDataStateIndex, handleDataStatesChange],
  );

  const activeData = dataStates[activeDataStateIndex]?.data ?? {};

  useAgentContext({
    description: "The current data",
    value: activeData as Record<string, JsonSerializable>,
  });

  useAgentContext({
    description: "The current components",
    value: components as unknown as JsonSerializable[],
  });

  useAgentContext({
    description:
      "Gallery of 33 reference widgets showing the quality bar. Use these as inspiration for improvements.",
    value: GALLERY_WIDGETS.map((g) => ({
      name: g.widget.name,
      description: g.widget.description,
      componentCount: g.widget.components.length,
    })) as unknown as JsonSerializable[],
  });

  // When a custom catalog is active, inject its component descriptions
  // so the LLM knows what components are available
  useAgentContext({
    description: activeCatalog.isBasic
      ? "Using the built-in basic A2UI catalog. No custom catalog override."
      : "IMPORTANT: A custom component catalog is active. Use ONLY these components when generating widgets. Ignore the default A2UI component list from your system prompt.",
    value: (activeCatalog.isBasic
      ? { catalogType: "basic" }
      : {
          catalogType: "custom",
          catalogLabel: activeCatalog.label,
          availableComponents: activeCatalog.componentSummary,
        }) as unknown as JsonSerializable,
  });

  // Tool for AI to edit the widget
  useFrontendTool({
    name: "editWidget",
    description:
      "Edit the widget by updating its data and/or components. Both parameters are optional - pass only what you want to change.",
    parameters: z.object({
      data: z
        .string()
        .optional()
        .describe(
          "The new data object for the widget as a JSON string, not a raw JSON object. Optional.",
        ),
      components: z
        .string()
        .optional()
        .describe(
          "The new components array for the widget as a JSON string, not a raw JSON object. Optional.",
        ),
    }),
    render: ({ args, status }) => {
      const isBuilding = status !== "complete";

      return (
        <details className="my-4">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-2 py-1">
            {isBuilding ? (
              <span className="animate-pulse mb-4">
                Generating component...
              </span>
            ) : (
              <span>View details</span>
            )}
          </summary>
          <pre className="mt-2 text-xs bg-card border border-border rounded-lg p-4 overflow-auto max-h-48 w-full font-mono text-card-foreground shadow-sm">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      );
    },
    handler: async ({ data, components: newComponents }) => {
      try {
        if (data !== undefined) {
          handleUpdateDataState(
            activeDataStateIndex,
            parseRobustJSON(data) as Record<string, unknown>,
          );
        }
        if (newComponents !== undefined) {
          // Pretty-print the JSON for the editor
          const prettyJson = JSON.stringify(
            parseRobustJSON(newComponents),
            null,
            2,
          );
          handleComponentsChange(prettyJson);
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        return {
          success: false,
          error: `Invalid JSON, make sure it is stringified: ${error}`,
        };
      }

      return {
        success: true,
        updated: {
          data: data !== undefined,
          components: newComponents !== undefined,
        },
      };
    },
  });

  // Auto-send initial prompt from create page
  useEffect(() => {
    if (!initialPrompt || hasAutoSent.current) return;
    hasAutoSent.current = true;

    // eslint-disable-next-line -- CopilotKit agent API requires direct mutation
    agent.threadId = widget.id;
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: initialPrompt,
    });
    copilotkit.runAgent({ agent }).catch(console.error);
  }, [initialPrompt, agent, copilotkit, widget.id]);

  return (
    <div className="flex h-full gap-2">
      {/* Main editor area */}
      <div className="flex flex-1 flex-col bg-background rounded-lg overflow-hidden">
        <EditorHeader widget={widget} />

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left: Code Editor + Data Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={70} minSize={20}>
                <CodeEditor
                  value={componentsJson}
                  onChange={handleComponentsChange}
                />
              </ResizablePanel>

              <ResizableHandle />

              {/* Data Panel */}
              <ResizablePanel defaultSize={30} minSize={15}>
                <DataPanel
                  dataStates={dataStates}
                  activeIndex={activeDataStateIndex}
                  onActiveIndexChange={setActiveDataStateIndex}
                  onAddState={handleAddDataState}
                  onUpdateState={handleUpdateDataState}
                  onRenameState={handleRenameDataState}
                  onDeleteState={handleDeleteDataState}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          {/* Middle: Preview Pane */}
          <ResizablePanel defaultSize={50} minSize={20}>
            <PreviewPane
              root={widget.root}
              components={components}
              data={activeData}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Right: Chat column - styled like left sidebar */}
      <div className="w-[400px] shrink-0 border-2 border-white bg-white rounded-lg overflow-hidden">
        <CopilotChat
          threadId={widget.id}
          className="h-full"
          feather={{ className: "right-0" }}
          inputProps={{
            className: "border shadow-sm bg-white/50",
            sendButton: {
              className:
                "enabled:bg-gradient-to-br enabled:from-violet-500 enabled:to-indigo-600 enabled:hover:from-violet-600 enabled:hover:to-indigo-700 enabled:border-0",
            },
          }}
          disclaimer={() => (
            <div className="text-center text-xs text-muted-foreground py-2">
              Powered by 🪁 CopilotKit
            </div>
          )}
        />
      </div>
    </div>
  );
}

/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { WidgetInput } from "./widget-input";
import { useWidgets } from "@/contexts/widgets-context";
import type { Widget } from "@/types/widget";
import type { A2UIComponent } from "@/types/widget";

const DEFAULT_COMPONENTS: A2UIComponent[] = [
  {
    id: "root",
    component: "Card",
    child: "content",
  },
  {
    id: "content",
    component: "Text",
    value: "Hello World",
    variant: "body",
  },
];

const DEFAULT_DATA = {};

export function CreateWidget() {
  const router = useRouter();
  const { addWidget } = useWidgets();
  const [inputValue, setInputValue] = useState("");

  const handleCreate = async () => {
    if (!inputValue.trim()) return;

    const widgetId = uuidv4();

    // Create placeholder widget immediately
    const newWidget: Widget = {
      id: widgetId,
      name: "Untitled widget",
      createdAt: new Date(),
      updatedAt: new Date(),
      root: "root",
      components: DEFAULT_COMPONENTS,
      dataStates: [
        {
          name: "default",
          data: DEFAULT_DATA,
        },
      ],
    };

    await addWidget(newWidget);

    // Navigate to editor immediately — agent processes there
    router.push(
      `/widget/${widgetId}?prompt=${encodeURIComponent(inputValue.trim())}`,
    );
  };

  const handleStartBlank = async () => {
    const id = uuidv4();
    const newWidget: Widget = {
      id,
      name: "Untitled widget",
      createdAt: new Date(),
      updatedAt: new Date(),
      root: "root",
      components: DEFAULT_COMPONENTS,
      dataStates: [
        {
          name: "default",
          data: DEFAULT_DATA,
        },
      ],
    };
    await addWidget(newWidget);
    router.push(`/widget/${id}`);
  };

  return (
    <div className="flex w-full flex-col items-center gap-4 px-4">
      <h1 className="text-4xl font-extralight tracking-tight">
        What would you like to build?
      </h1>
      <WidgetInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleCreate}
        disabled={false}
      />
      <span className="text-xs text-muted-foreground">
        Powered by 🪁 CopilotKit
      </span>
      <button
        onClick={handleStartBlank}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        or <span className="underline">Start Blank</span>
      </button>
    </div>
  );
}

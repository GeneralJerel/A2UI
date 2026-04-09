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

'use client';

import dynamic from "next/dynamic";
import type { A2UIComponent } from "@/types/widget";
import type { Catalog } from '@a2ui/web_core/v0_9';
import type { ReactComponentImplementation } from '@/lib/a2ui-v09-renderer/adapter';

const V09Viewer = dynamic(() => import("./v09Viewer").then(m => ({ default: m.V09Viewer })), {
  ssr: false,
});

export interface A2UIViewerProps {
  root: string;
  components: A2UIComponent[];
  data?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  onAction?: (action: unknown) => void;
  className?: string;
  catalog?: Catalog<ReactComponentImplementation>;
}

export function A2UIViewer({ components, catalog, ...props }: A2UIViewerProps) {
  return (
    <V09Viewer
      root={props.root}
      components={components as Array<{ id: string; component: string; [key: string]: unknown }>}
      data={props.data}
      theme={props.theme}
      onAction={props.onAction}
      catalog={catalog}
    />
  );
}

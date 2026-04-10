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

import { useMemo } from 'react';
import type { A2UIComponent } from '@/types/widget';

export interface A2UISurfaceState {
  root: string;
  components: A2UIComponent[];
  data: Record<string, unknown>;
  theme: Record<string, unknown>;
}

/**
 * Transform a stream of A2UI messages (v0.8 or v0.9) into
 * the v0.9 component format that V09Viewer expects.
 *
 * v0.9 messages (createSurface, updateComponents, updateDataModel) are
 * processed natively. v0.8 messages (beginRendering, surfaceUpdate,
 * dataModelUpdate) are upconverted to v0.9 format on the fly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- A2UI messages are untyped JSONL
export function useA2UISurface(messages: Record<string, any>[]): A2UISurfaceState {
  return useMemo(() => {
    let root = "root";
    const componentsMap = new Map<string, A2UIComponent>();
    let data: Record<string, unknown> = {};
    let theme: Record<string, unknown> = {};

    for (const msg of messages) {
      if (!msg) continue;

      // --- v0.9 messages ---
      if (msg.createSurface) {
        root = "root";
        if (msg.createSurface.theme && typeof msg.createSurface.theme === 'object') {
          theme = { ...msg.createSurface.theme };
        }
      }
      if (msg.updateComponents) {
        for (const comp of msg.updateComponents.components || []) {
          if (comp.id) {
            componentsMap.set(comp.id, comp);
          }
        }
      }
      if (msg.updateDataModel) {
        const op = msg.updateDataModel.op || 'replace';
        const path = msg.updateDataModel.path || '/';
        const value = msg.updateDataModel.value ?? msg.updateDataModel.contents;

        if (op === 'remove') {
          if (path === '/') {
            data = {};
          } else {
            const segments = path.replace(/^\//, '').split('/');
            deleteAtPath(data, segments);
          }
        } else if (value !== undefined) {
          if (path === '/') {
            if (typeof value === 'object' && !Array.isArray(value)) {
              const valObj = value as Record<string, unknown>;
              data = op === 'replace' ? { ...valObj } : { ...data, ...valObj };
            }
          } else {
            const segments = path.replace(/^\//, '').split('/');
            setAtPath(data, segments, value);
          }
        }
      }
      if (msg.deleteSurface) {
        componentsMap.clear();
        data = {};
        root = "root";
      }

      // --- v0.8 messages (legacy theater scenarios) ---
      if (msg.beginRendering) {
        root = msg.beginRendering.root || "root";
      }
      if (msg.surfaceUpdate) {
        for (const comp of msg.surfaceUpdate.components || []) {
          if (comp.id && comp.component) {
            componentsMap.set(comp.id, convertV08Component(comp));
          }
        }
      }
      if (msg.dataModelUpdate) {
        const contents = msg.dataModelUpdate.contents;
        if (contents) {
          if (Array.isArray(contents)) {
            for (const item of contents) {
              if (item.key !== undefined) {
                data[item.key as string] = extractValueMapValue(item);
              } else {
                data = { ...data, ...item };
              }
            }
          } else if (typeof contents === 'object') {
            data = { ...data, ...contents };
          }
        }
      }
    }

    return {
      root,
      components: Array.from(componentsMap.values()),
      data,
      theme,
    };
  }, [messages]);
}

/**
 * Convert a v0.8 component `{ id, component: { Type: { props } } }`
 * to v0.9 format `{ id, component: "Type", ...flatProps }`.
 */
function convertV08Component(comp: Record<string, unknown>): A2UIComponent {
  const componentMap = comp.component as Record<string, Record<string, unknown>>;
  const typeName = Object.keys(componentMap)[0] ?? 'Unknown';
  const rawProps = componentMap[typeName] ?? {};

  const result: A2UIComponent = { id: comp.id as string, component: typeName };

  for (const [key, value] of Object.entries(rawProps)) {
    if (key === 'usageHint') {
      result.variant = value;
    } else {
      result[key] = unwrapV08Value(value);
    }
  }

  return result;
}

/**
 * Unwrap v0.8 value wrappers to v0.9 format.
 */
function unwrapV08Value(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  if ('stringValue' in obj) return obj.stringValue;
  if ('literalString' in obj) return obj.literalString;
  if ('explicitList' in obj) return obj.explicitList;
  if ('path' in obj && Object.keys(obj).length === 1) return value;
  return value;
}

/**
 * Extract a JavaScript value from a v0.8 ValueMap entry.
 */
function extractValueMapValue(item: Record<string, unknown>): unknown {
  if (item.valueString !== undefined) return item.valueString;
  if (item.valueNumber !== undefined) return item.valueNumber;
  if (item.valueBoolean !== undefined) return item.valueBoolean;
  if (item.valueMap !== undefined) {
    const obj: Record<string, unknown> = {};
    for (const child of item.valueMap as Record<string, unknown>[]) {
      obj[child.key as string] = extractValueMapValue(child);
    }
    return obj;
  }
  return null;
}

/** Set a value at a JSON Pointer path within an object. */
function setAtPath(obj: Record<string, unknown>, segments: string[], value: unknown): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!;
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = segments[segments.length - 1];
  if (lastKey !== undefined) current[lastKey] = value;
}

/** Delete a value at a JSON Pointer path within an object. */
function deleteAtPath(obj: Record<string, unknown>, segments: string[]): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!;
    if (current[key] === undefined || typeof current[key] !== 'object') {
      return;
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = segments[segments.length - 1];
  if (lastKey !== undefined) delete current[lastKey];
}

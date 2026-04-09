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

/**
 * Utilities for building custom A2UI catalogs from user-provided definitions.
 *
 * Users provide a JSON array of component definitions. Each definition has a
 * name, optional description, and a props object mapping prop names to types.
 * We convert these into real Catalog instances with generic React renderers.
 */

import { z } from 'zod';
import React from 'react';
import { Catalog } from '@a2ui/web_core/v0_9';
import type { ReactComponentImplementation } from './a2ui-v09-renderer/adapter';

// ---------------------------------------------------------------------------
// Types for user-provided component definitions
// ---------------------------------------------------------------------------

export interface CustomPropDef {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
}

export interface CustomComponentDef {
  name: string;
  description?: string;
  /** child / children support */
  hasChild?: boolean;
  hasChildren?: boolean;
  props: Record<string, CustomPropDef>;
}

// ---------------------------------------------------------------------------
// Zod schema builder
// ---------------------------------------------------------------------------

function propDefToZod(def: CustomPropDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  switch (def.type) {
    case 'string':
      schema = z.unknown(); // A2UI resolves expressions to unknown at runtime
      break;
    case 'number':
      schema = z.unknown();
      break;
    case 'boolean':
      schema = z.unknown();
      break;
    case 'array':
      schema = z.unknown();
      break;
    case 'object':
      schema = z.unknown();
      break;
    default:
      schema = z.unknown();
  }
  if (def.description) {
    schema = schema.describe(def.description);
  }
  return schema.optional();
}

function buildComponentSchema(def: CustomComponentDef): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [propName, propDef] of Object.entries(def.props)) {
    shape[propName] = propDefToZod(propDef);
  }

  // Add child/children support
  if (def.hasChild) {
    shape['child'] = z.string().optional();
  }
  if (def.hasChildren) {
    shape['children'] = z.unknown().optional();
  }

  return z.object(shape);
}

// ---------------------------------------------------------------------------
// Generic React renderer
// ---------------------------------------------------------------------------

/**
 * Creates a generic renderer that displays the component type and its
 * resolved props in a simple card layout.
 */
function createGenericRenderer(def: CustomComponentDef): ReactComponentImplementation {
  const schema = buildComponentSchema(def);

  const render: React.FC<{
    context: import('@a2ui/web_core/v0_9').ComponentContext;
    buildChild: (id: string, basePath?: string) => React.ReactNode;
  }> = ({ context, buildChild }) => {
    const model = context.componentModel;

    // Render children if present
    const childContent: React.ReactNode[] = [];
    if (def.hasChild && model.properties?.child) {
      const childId = String(model.properties.child);
      childContent.push(
        React.createElement('div', { key: childId }, buildChild(childId))
      );
    }
    if (def.hasChildren) {
      const children = model.properties?.children;
      if (Array.isArray(children)) {
        for (const childId of children) {
          childContent.push(
            React.createElement('div', { key: String(childId) }, buildChild(String(childId)))
          );
        }
      }
    }

    // Build prop display
    const propEntries: React.ReactNode[] = [];
    for (const [propName, propDef] of Object.entries(def.props)) {
      const value = model.properties?.[propName];
      if (value !== undefined && value !== null) {
        propEntries.push(
          React.createElement('div', {
            key: propName,
            style: { fontSize: '0.8rem', color: '#666', marginBottom: '2px' },
          },
            React.createElement('span', { style: { fontWeight: 500, color: '#333' } }, propName),
            ': ',
            typeof value === 'object' ? JSON.stringify(value) : String(value),
          )
        );
      }
    }

    return React.createElement('div', {
      style: {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '12px',
        margin: '4px 0',
        backgroundColor: '#fafafa',
      }
    },
      React.createElement('div', {
        style: {
          fontSize: '0.7rem',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          color: '#8b5cf6',
          marginBottom: '6px',
        }
      }, def.name),
      propEntries.length > 0 && React.createElement('div', {
        style: { marginBottom: childContent.length > 0 ? '8px' : 0 }
      }, ...propEntries),
      ...childContent,
    );
  };

  return {
    name: def.name,
    schema,
    render,
  };
}

// ---------------------------------------------------------------------------
// Catalog builder
// ---------------------------------------------------------------------------

const CUSTOM_CATALOG_URL_PREFIX = 'custom://';

export function buildCustomCatalog(
  catalogId: string,
  componentDefs: CustomComponentDef[],
): Catalog<ReactComponentImplementation> {
  const components = componentDefs.map(createGenericRenderer);
  return new Catalog<ReactComponentImplementation>(
    `${CUSTOM_CATALOG_URL_PREFIX}${catalogId}`,
    components,
    [], // no custom functions for now
  );
}

// ---------------------------------------------------------------------------
// Component summary for LLM prompt
// ---------------------------------------------------------------------------

export function buildComponentSummary(componentDefs: CustomComponentDef[]): string {
  return componentDefs.map((def) => {
    const propsDesc = Object.entries(def.props)
      .map(([name, p]) => `\`${name}\` (${p.type}${p.description ? ` — ${p.description}` : ''})`)
      .join(', ');

    const extras: string[] = [];
    if (def.hasChild) extras.push('`child` (string — single child component ID)');
    if (def.hasChildren) extras.push('`children` (string[] — child component IDs)');

    const allProps = [propsDesc, ...extras].filter(Boolean).join(', ');

    return `- **${def.name}**${def.description ? `: ${def.description}` : ''}. Props: ${allProps || 'none'}`;
  }).join('\n');
}

// ---------------------------------------------------------------------------
// Default example for the editor
// ---------------------------------------------------------------------------

export const EXAMPLE_CATALOG_JSON: CustomComponentDef[] = [
  {
    name: 'BarChart',
    description: 'Displays data as a bar chart',
    props: {
      title: { type: 'string', description: 'Chart title' },
      description: { type: 'string', description: 'Brief description or subtitle' },
      data: { type: 'array', description: 'Array of { label, value } data points' },
    },
  },
  {
    name: 'PieChart',
    description: 'Displays data as a pie chart',
    props: {
      title: { type: 'string', description: 'Chart title' },
      description: { type: 'string', description: 'Brief description' },
      data: { type: 'array', description: 'Array of { label, value } segments' },
    },
  },
  {
    name: 'StatCard',
    description: 'Displays a key metric with label and value',
    props: {
      label: { type: 'string', description: 'Metric label' },
      value: { type: 'string', description: 'Metric value (formatted)' },
      trend: { type: 'string', description: 'Trend direction: up, down, or flat' },
    },
  },
  {
    name: 'DataTable',
    description: 'Renders a table with headers and rows',
    hasChildren: true,
    props: {
      headers: { type: 'array', description: 'Column header labels' },
      data: { type: 'array', description: 'Array of row objects' },
    },
  },
];

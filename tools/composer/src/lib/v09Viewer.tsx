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
 * V0.9 A2UI Surface viewer.
 *
 * Renders v0.9 component definitions using the React v0.9 renderer.
 * Creates a SurfaceModel via MessageProcessor and renders with A2uiSurface.
 */
'use client';

import { useMemo, useRef } from 'react';
import { A2uiSurface, basicCatalog } from '@/lib/a2ui-v09-renderer';
import { MessageProcessor } from '@a2ui/web_core/v0_9';

const SURFACE_ID = 'v09-preview';

interface V09Component {
  id: string;
  component: string;
  [key: string]: unknown;
}

export interface V09ViewerProps {
  root: string;
  components: V09Component[];
  data?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  onAction?: (action: unknown) => void;
}

export function V09Viewer({
  root,
  components,
  data = {},
  theme,
  onAction,
}: V09ViewerProps) {
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const catalogId = basicCatalog.id;

  const surface = useMemo(() => {
    const actionHandler = (action: unknown) => onActionRef.current?.(action);
    const processor = new MessageProcessor(
      [basicCatalog],
      actionHandler,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      {
        createSurface: {
          surfaceId: SURFACE_ID,
          catalogId,
          ...(theme ? { theme } : {}),
        },
      },
      {
        updateComponents: {
          surfaceId: SURFACE_ID,
          components: components.map((c) => {
            if (c.id === root) {
              return { ...c, id: 'root' };
            }
            return c;
          }),
        },
      },
    ];

    if (data && Object.keys(data).length > 0) {
      messages.push({
        updateDataModel: {
          surfaceId: SURFACE_ID,
          path: '/',
          op: 'replace',
          value: data,
        },
      });
    }

    processor.processMessages(messages);

    return processor.model.getSurface(SURFACE_ID);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onAction stabilized via ref
  }, [root, components, data, theme, catalogId]);

  if (!surface) {
    return <div style={{ color: 'gray', padding: '8px' }}>No surface created</div>;
  }

  return <A2uiSurface surface={surface} />;
}

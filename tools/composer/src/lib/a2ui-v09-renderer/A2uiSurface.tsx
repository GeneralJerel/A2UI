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

import React, {useSyncExternalStore, memo, useMemo, useCallback} from 'react';
import {type SurfaceModel, ComponentContext, type ComponentModel} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from './adapter';

const ResolvedChild = memo(
  ({
    surface,
    id,
    basePath,
    compImpl,
    componentModel,
  }: {
    surface: SurfaceModel<ReactComponentImplementation>;
    id: string;
    basePath: string;
    componentModel: ComponentModel;
    compImpl: ReactComponentImplementation;
  }) => {
    const ComponentToRender = compImpl.render;

    // Create context. Recreate if the componentModel instance changes (e.g. type change recreation).
    const context = useMemo(
      () => new ComponentContext(surface, id, basePath),
      // componentModel is used as a trigger for recreation even if not in the body
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [surface, id, basePath, componentModel]
    );

    const buildChild = useCallback(
      (childId: string, specificPath?: string) => {
        const path = specificPath || context.dataContext.path;
        return (
          <DeferredChild
            key={`${childId}-${path}`}
            surface={surface}
            id={childId}
            basePath={path}
          />
        );
      },
      [surface, context.dataContext.path]
    );

    return <ComponentToRender context={context} buildChild={buildChild} />;
  }
);
ResolvedChild.displayName = 'ResolvedChild';

export const DeferredChild: React.FC<{
  surface: SurfaceModel<ReactComponentImplementation>;
  id: string;
  basePath: string;
}> = memo(({surface, id, basePath}) => {
  // 1. Subscribe specifically to this component's existence
  const store = useMemo(() => {
    let version = 0;
    return {
      subscribe: (cb: () => void) => {
        const unsub1 = surface.componentsModel.onCreated.subscribe((comp) => {
          if (comp.id === id) {
            version++;
            cb();
          }
        });
        const unsub2 = surface.componentsModel.onDeleted.subscribe((delId) => {
          if (delId === id) {
            version++;
            cb();
          }
        });
        return () => {
          unsub1.unsubscribe();
          unsub2.unsubscribe();
        };
      },
      getSnapshot: () => {
        const comp = surface.componentsModel.get(id);
        // We use instance identity + version as the snapshot to ensure
        // type replacements (e.g. Button -> Text) trigger a re-render.
        return comp ? `${comp.type}-${version}` : `missing-${version}`;
      },
    };
  }, [surface, id]);

  useSyncExternalStore(store.subscribe, store.getSnapshot);

  const componentModel = surface.componentsModel.get(id);

  if (!componentModel) {
    return <div style={{color: 'gray', padding: '4px'}}>[Loading {id}...]</div>;
  }

  const compImpl = surface.catalog.components.get(componentModel.type);

  if (!compImpl) {
    return <div style={{color: 'red'}}>Unknown component: {componentModel.type}</div>;
  }

  return (
    <ResolvedChild
      surface={surface}
      id={id}
      basePath={basePath}
      componentModel={componentModel}
      compImpl={compImpl}
    />
  );
});
DeferredChild.displayName = 'DeferredChild';

/** Map v0.9 theme properties to CSS custom properties */
function themeToStyle(theme: unknown): React.CSSProperties {
  if (!theme || typeof theme !== 'object') return {};
  const t = theme as Record<string, unknown>;
  const style: Record<string, string> = {};
  if (typeof t.primaryColor === 'string') style['--a2ui-primary-color'] = t.primaryColor;
  if (typeof t.backgroundColor === 'string') style['--a2ui-card-bg'] = t.backgroundColor;
  if (typeof t.borderRadius === 'string') style['--radius'] = t.borderRadius;
  if (typeof t.fontFamily === 'string') style['--font-geist-sans'] = t.fontFamily;
  if (typeof t.headingWeight === 'string' || typeof t.headingWeight === 'number') style['--a2ui-heading-weight'] = String(t.headingWeight);
  if (typeof t.shadowCard === 'string') style['--a2ui-shadow-card'] = t.shadowCard;
  return style as unknown as React.CSSProperties;
}

export const A2uiSurface: React.FC<{surface: SurfaceModel<ReactComponentImplementation>}> = ({
  surface,
}) => {
  const themeStyle = useMemo(() => themeToStyle(surface.theme), [surface.theme]);
  // The root component always has ID 'root' and base path '/'
  return (
    <div style={themeStyle}>
      <DeferredChild surface={surface} id="root" basePath="/" />
    </div>
  );
};

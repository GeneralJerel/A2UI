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

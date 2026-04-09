'use client';

import { Widget } from '@/types/widget';
import { A2UIViewer } from '@/lib/a2ui';

interface GalleryWidgetProps {
  widget: Widget;
  height?: number;
  onClick?: () => void;
}

export function GalleryWidget({ widget, height = 200, onClick }: GalleryWidgetProps) {
  // Get the first data state's data for preview
  const previewData = widget.dataStates?.[0]?.data ?? {};

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className="w-full text-left rounded-xl border p-4 shadow-sm transition-all hover:shadow-md cursor-pointer overflow-hidden bg-white/80 border-white hover:border-muted-foreground/30"
      style={{ minHeight: height }}
    >
      <div className="flex flex-col gap-2 h-full">
        <span className="text-xs font-medium text-muted-foreground">
          {widget.name}
        </span>
        <div className="pointer-events-none flex-1 flex items-center justify-center overflow-hidden">
          <div
            className="a2ui-style-composer w-full"
            // Vertical-only 6px margin for compact gallery previews (default is 8px all sides)
            style={{ '--a2ui-leaf-margin': '6px 0' } as React.CSSProperties}
          >
            <A2UIViewer
              root={widget.root}
              components={widget.components}
              data={previewData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

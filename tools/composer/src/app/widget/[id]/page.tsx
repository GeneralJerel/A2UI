'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { WidgetEditor } from '@/components/editor/widget-editor';
import { useWidgets } from '@/contexts/widgets-context';

interface WidgetPageProps {
  params: Promise<{ id: string }>;
}

export default function WidgetPage({ params }: WidgetPageProps) {
  const { id } = use(params);
  const { loading, getWidget } = useWidgets();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') ?? undefined;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const widget = getWidget(id);

  if (!widget) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Widget not found</div>
      </div>
    );
  }

  return <WidgetEditor widget={widget} initialPrompt={initialPrompt} />;
}

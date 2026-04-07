'use client';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; data?: Record<string, unknown>; }

export function NotesPane({ id, data }: Props) {
  return (
    <PaneShell id={id} defaultWidth={500} defaultHeight={600}>
      <AppLoader appId="notes" paneId={id} initialData={data ?? {}} />
    </PaneShell>
  );
}

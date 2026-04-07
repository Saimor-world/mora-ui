'use client';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; data?: Record<string, unknown>; }

export function CalendarPane({ id, data }: Props) {
  return (
    <PaneShell id={id} defaultWidth={640} defaultHeight={600}>
      <AppLoader appId="calendar" paneId={id} initialData={data ?? {}} />
    </PaneShell>
  );
}

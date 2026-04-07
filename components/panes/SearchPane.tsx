'use client';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; data?: Record<string, unknown>; }

export function SearchPane({ id, data }: Props) {
  return (
    <PaneShell id={id} defaultWidth={540} defaultHeight={640}>
      <AppLoader appId="search" paneId={id} initialData={data ?? {}} />
    </PaneShell>
  );
}

export default SearchPane;

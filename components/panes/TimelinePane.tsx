'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; data?: Record<string, unknown>; }

export function TimelinePane({ id, data }: Props) {
  return (
    <PaneShell id={id} defaultWidth={420} defaultHeight={640}>
      <AppLoader appId="timeline" paneId={id} initialData={data ?? {}} />
    </PaneShell>
  );
}

'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; data?: Record<string, unknown>; }

export function TasksPane({ id, data }: Props) {
  return (
    <PaneShell id={id} defaultWidth={800} defaultHeight={560}>
      <AppLoader appId="tasks" paneId={id} initialData={data ?? {}} />
    </PaneShell>
  );
}

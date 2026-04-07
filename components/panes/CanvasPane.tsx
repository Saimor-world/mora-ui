'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; data?: Record<string, unknown>; }

export function CanvasPane({ id, data }: Props) {
  return (
    <PaneShell id={id} defaultWidth={900} defaultHeight={680}>
      <AppLoader appId="canvas" paneId={id} initialData={data ?? {}} />
    </PaneShell>
  );
}

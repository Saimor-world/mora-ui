'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

// Re-exported for existing unit tests — implementation moved to apps/work-session/utils.ts
export { splitAtPlannedSteps, groupStepsBySegment } from '@/apps/work-session/utils';

export const WorkSessionPane: React.FC<{ id: string }> = ({ id }) => (
  <PaneShell id={id} defaultWidth={560} defaultHeight={700}>
    <AppLoader appId="work-session" paneId={id} />
  </PaneShell>
);

'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; }

export const AppLibraryPane: React.FC<Props> = ({ id }) => (
  <PaneShell id={id} title="Apps" defaultWidth={640} defaultHeight={560}>
    <AppLoader appId="apps" paneId={id} />
  </PaneShell>
);

'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

interface Props { id: string; }

export const DocumentPane: React.FC<Props> = ({ id }) => (
  <PaneShell id={id} defaultWidth={800} defaultHeight={600}>
    <AppLoader appId="document" paneId={id} />
  </PaneShell>
);

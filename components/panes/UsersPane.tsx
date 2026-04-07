'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';
import { PaneShell } from './PaneShell';

export const UsersPane: React.FC<{ id?: string }> = ({ id = 'users-main' }) => (
  <PaneShell id={id} defaultWidth={700} defaultHeight={600}>
    <AppLoader appId="users" paneId={id} />
  </PaneShell>
);

export default UsersPane;

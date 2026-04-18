'use client';
import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id?: string; data?: Record<string, unknown>; onClose?: () => void; }

export const TeamPane: React.FC<Props> = ({ id = 'team-main', data, onClose }) => (
  <AppLoader appId="team" paneId={id} initialData={data ?? {}} onClose={onClose} />
);

export default TeamPane;

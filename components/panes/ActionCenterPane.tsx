'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id?: string; data?: Record<string, unknown>; }

export function ActionCenterPane({ id = 'actions-main', data }: Props) {
  return <AppLoader appId="action-center" paneId={id} initialData={data ?? {}} />;
}

export default ActionCenterPane;

'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id?: string; data?: Record<string, unknown>; }

export function UsersPane({ id = 'users-main', data }: Props) {
  return <AppLoader appId="users" paneId={id} initialData={data ?? {}} />;
}

export default UsersPane;

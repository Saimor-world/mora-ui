'use client';
// Stub — replaced by full Kanban implementation in Plan 4 (app-platform-new-apps)
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function TasksPane({ id, data }: Props) {
  return <AppLoader appId="tasks" paneId={id} initialData={data ?? {}} />;
}

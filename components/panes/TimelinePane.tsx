'use client';
// Stub — replaced by full Activity Feed implementation in Plan 4 (app-platform-new-apps)
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function TimelinePane({ id, data }: Props) {
  return <AppLoader appId="timeline" paneId={id} initialData={data ?? {}} />;
}

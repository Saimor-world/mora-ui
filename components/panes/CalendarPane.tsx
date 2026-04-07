'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function CalendarPane({ id, data }: Props) {
  return <AppLoader appId="calendar" paneId={id} initialData={data ?? {}} />;
}

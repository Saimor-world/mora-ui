'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function NotesPane({ id, data }: Props) {
  return <AppLoader appId="notes" paneId={id} initialData={data ?? {}} />;
}

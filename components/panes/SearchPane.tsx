'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function SearchPane({ id, data }: Props) {
  return <AppLoader appId="search" paneId={id} initialData={data ?? {}} />;
}

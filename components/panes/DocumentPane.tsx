'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function DocumentPane({ id, data }: Props) {
  return <AppLoader appId="document" paneId={id} initialData={data ?? {}} />;
}

export default DocumentPane;

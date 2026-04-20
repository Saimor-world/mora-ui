'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function ScannerPane({ id, data }: Props) {
  return <AppLoader appId="scanner" paneId={id} initialData={data ?? {}} />;
}

export default ScannerPane;

'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function TerminalPane({ id, data }: Props) {
  return <AppLoader appId="terminal" paneId={id} initialData={data ?? {}} />;
}

export default TerminalPane;

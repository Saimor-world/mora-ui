'use client';
// Stub — replaced by full Whiteboard implementation in Plan 4 (app-platform-new-apps)
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function CanvasPane({ id, data }: Props) {
  return <AppLoader appId="canvas" paneId={id} initialData={data ?? {}} />;
}

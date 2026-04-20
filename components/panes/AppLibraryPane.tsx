'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id: string; data?: Record<string, unknown>; }

export function AppLibraryPane({ id, data }: Props) {
  return <AppLoader appId="apps" paneId={id} initialData={data ?? {}} />;
}

export const AppLibrary = AppLibraryPane;
export default AppLibraryPane;

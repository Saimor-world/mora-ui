'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id?: string; data?: Record<string, unknown>; }

export function IntegrationsPane({ id = 'integrations-main', data }: Props) {
  return <AppLoader appId="integrations" paneId={id} initialData={data ?? {}} />;
}

export default IntegrationsPane;

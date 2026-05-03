'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id?: string; data?: Record<string, unknown>; }

export function MailPane({ id = 'mail-main', data }: Props) {
  return <AppLoader appId="mail" paneId={id} initialData={data ?? {}} />;
}

export default MailPane;

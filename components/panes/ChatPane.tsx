'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props { id?: string; data?: Record<string, unknown>; }

export function ChatPane({ id = 'chat-main', data }: Props) {
  return <AppLoader appId="chat" paneId={id} initialData={data ?? {}} />;
}

export default ChatPane;

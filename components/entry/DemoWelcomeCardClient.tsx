'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { DemoWelcomeCard } from './DemoWelcomeCard';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

interface Props {
    context: WebsiteEntryContext;
}

/**
 * Server-page-safe wrapper for DemoWelcomeCard.
 * Uses `useRouter` so the server component doesn't need to handle navigation.
 */
export function DemoWelcomeCardClient({ context }: Props) {
    const router = useRouter();
    return <DemoWelcomeCard context={context} onOpen={() => router.push('/home')} />;
}

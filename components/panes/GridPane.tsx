'use client';

import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props {
    id: string;
    data?: Record<string, unknown>;
}

export function GridPane({ id, data }: Props) {
    return <AppLoader appId="grid" paneId={id} initialData={data ?? {}} />;
}

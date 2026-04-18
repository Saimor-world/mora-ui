'use client';

import { AppLoader } from '@/lib/apps/AppLoader';

interface Props {
    id: string;
    data?: Record<string, unknown>;
}

export function FinderPane({ id, data }: Props) {
    return <AppLoader appId="finder" paneId={id} initialData={data ?? {}} />;
}

export default FinderPane;

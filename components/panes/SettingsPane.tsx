'use client';

import { AppLoader } from '@/lib/apps/AppLoader';

interface Props {
    id: string;
    data?: Record<string, unknown>;
}

export function SettingsPane({ id, data }: Props) {
    return <AppLoader appId="settings" paneId={id} initialData={data ?? {}} />;
}

export default SettingsPane;

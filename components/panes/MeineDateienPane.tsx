'use client';

import React from 'react';
import { AppLoader } from '@/lib/apps/AppLoader';

interface Props {
    id?: string;
}

export const MeineDateienPane: React.FC<Props> = ({ id = 'meine-dateien' }) => {
    return <AppLoader appId="meine-dateien" paneId={id} initialData={{}} />;
};

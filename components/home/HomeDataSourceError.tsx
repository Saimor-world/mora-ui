'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    /** When true, CORE home endpoints failed — do not pretend empty lists are truth. */
    show: boolean;
}

export function HomeDataSourceError({ show }: Props) {
    if (!show) return null;

    return (
        <div
            data-testid="home-datasource-error"
            className="pointer-events-auto relative z-20 mb-3 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100/90"
            role="alert"
        >
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300/80" />
            <div>
                <p className="font-medium text-amber-50/95">Datenquelle nicht erreichbar</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-amber-100/70">
                    Die Home-Ansicht kann gerade keine verifizierten Daten von CORE laden. Bereits geöffnete Bereiche bleiben nutzbar.
                </p>
            </div>
        </div>
    );
}

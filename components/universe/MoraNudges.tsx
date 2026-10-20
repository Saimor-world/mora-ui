'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flyMora, getMoraPresence } from '@/lib/universe/moraPresence';
import { deriveMoraNudges, shouldAutoFly, type MoraNudge, type MoraNudgeAction } from '@/lib/universe/moraProactivity';
import { usePaneStore } from '@/lib/store/paneStore';
import { SYSTEM_PANES } from '@/lib/universe/planetModel';

function paneForPlanet(planetId: string) {
    const cap = planetId.startsWith('system:') ? planetId.slice(7) : planetId.startsWith('sys:') ? planetId.slice(4) : '';
    return SYSTEM_PANES[cap];
}

function actOnNudge(nudge: MoraNudge, action: MoraNudgeAction) {
    const pane = paneForPlanet(nudge.planetId);
    if (pane) {
        usePaneStore.getState().openPane({
            ...pane,
            data: {
                moraNudge: nudge.id,
                moraAction: action,
                draftOnly: action === 'draft' || action === 'prep',
                autoSend: false,
            },
        } as Parameters<ReturnType<typeof usePaneStore.getState>['openPane']>[0]);
    }
    if (getMoraPresence().place !== 'planet' || getMoraPresence().target !== nudge.planetId) {
        flyMora('planet', { target: nudge.planetId, state: 'needs' });
    }
}

export function MoraNudges({
    mail,
    calendar,
    incidents,
    openTasks,
    dueToday,
    openInvoices,
}: {
    mail: { id: string; subject: string; from: string; date?: string }[];
    calendar: { id: string; title: string; date?: string; time?: string }[];
    incidents: { id: string; title?: string; severity?: string; status?: string }[];
    openTasks?: number;
    dueToday?: { id: string; title: string }[];
    openInvoices?: number;
}) {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const flew = useRef<string | null>(null);
    const nudges = useMemo(() => {
        const all = deriveMoraNudges({
            mail, calendar, incidents, openTasks, dueToday, openInvoices,
        });
        return all.filter((n) => !dismissed.includes(n.id));
    }, [mail, calendar, incidents, openTasks, dueToday, openInvoices, dismissed]);

    useEffect(() => {
        const fly = shouldAutoFly(nudges);
        if (!fly || flew.current === fly.id) return;
        flew.current = fly.id;
        flyMora('planet', { target: fly.planetId, state: 'needs' });
    }, [nudges]);

    if (!nudges.length) return null;

    return (
        <div className="uv2-mora-nudges" data-testid="uv2-mora-nudges" role="region" aria-label="MÔRA schlägt vor">
            {nudges.map((nudge) => (
                <div key={nudge.id} className="uv2-mora-nudge" data-nudge-kind={nudge.kind} data-nudge-fly={nudge.fly ? '' : undefined}>
                    <p className="uv2-mora-nudge__title">{nudge.title}</p>
                    <p className="uv2-mora-nudge__detail">{nudge.detail}</p>
                    <div className="uv2-mora-nudge__row">
                        <button type="button" className="uv2-mora-nudge__ok" onClick={() => actOnNudge(nudge, nudge.action)}>
                            {nudge.actionLabel}
                        </button>
                        <button type="button" className="uv2-mora-nudge__skip" onClick={() => setDismissed((d) => [...d, nudge.id])}>
                            Später
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

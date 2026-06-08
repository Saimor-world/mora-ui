'use client';

import { useEffect, useRef } from 'react';
import { corePost } from '@/lib/api/coreClient';
import { setDossierNodeId } from '@/lib/dossier/dossierNodeStorage';
import { useNavStore } from '@/lib/store/navStore';
import { saveWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

interface Props {
    context: WebsiteEntryContext;
    onReady: () => void;
    onError: () => void;
}

type PlaygroundAuditSession = {
    active_company_id?: string;
    node_id?: string;
};

function fallbackEmail(context: WebsiteEntryContext, visitorId: string) {
    const explicit = context.email?.trim();
    if (explicit && explicit.includes('@')) return explicit;
    const domain = context.domain?.trim() || 'scan.local';
    return `${visitorId}@${domain}`;
}

function taskSeverity(priority: WebsiteEntryContext['tasks'][number]['priority']) {
    if (priority === 'hoch') return 'risk';
    if (priority === 'mittel') return 'warn';
    return 'ok';
}

/**
 * Silently authenticates the visitor and creates the private audit dossier node.
 * The visitor surface can then read real CORE dossier metadata and submit it to Wall.
 */
export function SecurityCheckPlaygroundLogin({ context, onReady, onError }: Props) {
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        async function run() {
            try {
                let visitorId = typeof window !== 'undefined'
                    ? localStorage.getItem('saimor_visitor_id')
                    : null;
                if (!visitorId) {
                    visitorId = `visitor_${Math.random().toString(36).slice(2, 10)}`;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('saimor_visitor_id', visitorId);
                    }
                }

                const domain = context.domain?.trim() || 'scan.local';
                const email = fallbackEmail(context, visitorId);

                const session = await corePost('/v3/playground/ingest-audit', {
                    email,
                    visitor_id: visitorId,
                    visitor_name: context.companyName,
                    domain,
                    score: context.score ?? 0,
                    grade: context.grade,
                    level: context.level,
                    summary: context.summary,
                    audit_id: context.id,
                    findings: context.tasks.map((task) => ({
                        title: task.title,
                        severity: taskSeverity(task.priority),
                        desc: 'Aus dem Security-Check als nächste Aufgabe vorbereitet.',
                    })),
                    recommendations: context.tasks.map((task) => ({
                        title: task.title,
                        description: 'Im persönlichen OS-Raum prüfen und priorisieren.',
                    })),
                }) as PlaygroundAuditSession;

                if (context.id && session.node_id) {
                    setDossierNodeId(context.id, session.node_id);
                }
                if (session.active_company_id) {
                    useNavStore.getState().setActiveCompany(session.active_company_id);
                }

                saveWebsiteEntryContext(context, { openOnHome: true });
                useNavStore.getState().setActiveMode('visitor');

                onReady();
            } catch {
                onError();
            }
        }

        void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';
import { AppLoader } from '@/lib/apps/AppLoader';

// ── Legacy panes without a matching apps/ module ──────────────────────────────
import { CompanyDetailPane } from '@/components/panes/CompanyDetailPane';
import { MoraHubPane } from '@/components/panes/MoraHubPane';
import { BrowserPane } from '@/components/panes/BrowserPane';
import { WallPane } from '@/components/panes/WallPane';

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    if (!isPaneEnabled(pane.type)) {
        return null;
    }

    switch (pane.type) {
        // ── Migrated to App Platform ─────────────────────────────────────────
        case 'finder':
        case 'space':
            return <AppLoader appId="finder" paneId={pane.id} initialData={pane.data} />;
        case 'document':
            return <AppLoader appId="document" paneId={pane.id} initialData={pane.data} />;
        case 'notes':
            return <AppLoader appId="notes" paneId={pane.id} initialData={pane.data} />;
        case 'chat':
            return <AppLoader appId="chat" paneId={pane.id} initialData={pane.data} />;
        case 'search':
            return <AppLoader appId="search" paneId={pane.id} initialData={pane.data} />;
        case 'scanner':
            return <AppLoader appId="scanner" paneId={pane.id} initialData={pane.data} />;
        case 'users':
            return <AppLoader appId="users" paneId={pane.id} initialData={pane.data} />;
        case 'settings':
            return <AppLoader appId="settings" paneId={pane.id} initialData={pane.data} />;
        case 'calendar':
            return <AppLoader appId="calendar" paneId={pane.id} initialData={pane.data} />;
        case 'team':
            return <AppLoader appId="team" paneId={pane.id} initialData={pane.data} />;
        case 'terminal':
            return <AppLoader appId="terminal" paneId={pane.id} initialData={pane.data} />;
        case 'grid':
            return <AppLoader appId="grid" paneId={pane.id} initialData={pane.data} />;
        case 'tasks':
            return <AppLoader appId="tasks" paneId={pane.id} initialData={pane.data} />;
        case 'timeline':
            return <AppLoader appId="timeline" paneId={pane.id} initialData={pane.data} />;
        case 'canvas':
            return <AppLoader appId="canvas" paneId={pane.id} initialData={pane.data} />;
        case 'apps':
            return <AppLoader appId="apps" paneId={pane.id} initialData={pane.data} />;
        case 'meine-dateien':
            return <AppLoader appId="meine-dateien" paneId={pane.id} initialData={pane.data} />;
        case 'integrations':
            return <AppLoader appId="integrations" paneId={pane.id} initialData={pane.data} />;
        case 'mail':
            return <AppLoader appId="mail" paneId={pane.id} initialData={pane.data} />;
        case 'website-dossier':
            return <AppLoader appId="website-dossier" paneId={pane.id} initialData={pane.data} />;
        case 'actions':
        case 'action-center':
            return <AppLoader appId="action-center" paneId={pane.id} initialData={pane.data} />;
        case 'work-session':
            return <AppLoader appId="work-session" paneId={pane.id} initialData={pane.data} />;

        // ── No apps/ module yet — keep legacy pane ───────────────────────────
        case 'company-detail':
            return (
                <CompanyDetailPane
                    id={pane.id}
                    companyId={pane.data?.companyId}
                    companyName={pane.data?.companyName}
                />
            );
        case 'mora-hub':
            return <MoraHubPane id={pane.id} data={pane.data} />;
        case 'browser':
            return <BrowserPane id={pane.id} />;
        case 'wall':
            return <WallPane />;

        default:
            return null;
    }
};

export const PaneManager: React.FC = () => {
    const panes = usePaneStore((state) => state.panes);

    return (
        <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
                {panes.map((pane) => (
                    !pane.minimized && (
                        <div key={pane.id} className="pointer-events-auto contents">
                            <PaneRenderer pane={pane} />
                        </div>
                    )
                ))}
            </AnimatePresence>
        </div>
    );
};

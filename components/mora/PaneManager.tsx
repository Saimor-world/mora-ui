'use client';

import React from 'react';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';

// ── Core Work surfaces ──────────────────────────────────────────────────────
import { SettingsPane } from '@/components/panes/SettingsPane';
import { DocumentPane } from '@/components/panes/DocumentPane';
import { TeamPane } from '@/components/panes/TeamPane';
import { NotesPane } from '@/components/panes/NotesPane';
import { FinderPane } from '@/components/panes/FinderPane';
import { ChatPane } from '@/components/panes/ChatPane';
import { MeineDateienPane } from '@/components/panes/MeineDateienPane';

// ── App-tier surfaces ───────────────────────────────────────────────────────
import { GridPane } from '@/components/panes/GridPane';
import { SearchPane } from '@/components/panes/SearchPane';
import { ScannerPane } from '@/components/panes/ScannerPane';
import { UsersPane } from '@/components/panes/UsersPane';
import { CompanyDetailPane } from '@/components/panes/CompanyDetailPane';

// ── Future-tier surfaces (imports kept for later reactivation) ──────────────
// 1.0 gated — see docs/plans/2026-03-27-surface-hierarchy-1.0.md
// import { AppLibraryPane } from '@/components/panes/AppLibraryPane';
// import { MailPane } from '@/components/panes/MailPane';
// import { IntegrationsPane } from '@/components/panes/IntegrationsPane';
// import { CalendarPane } from '@/components/panes/CalendarPane';
// import { TerminalPane } from '@/components/panes/TerminalPane';
// import { MoraHubPane } from '@/components/panes/MoraHubPane';
// import { ActionCenterPane } from '@/components/panes/ActionCenterPane';
// import { WorkSessionPane } from '@/components/panes/WorkSessionPane';

import { AnimatePresence } from 'framer-motion';

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    // Gate: future-tier pane types render nothing
    if (!isPaneEnabled(pane.type)) {
        return null;
    }

    switch (pane.type) {
        // ── Core Work ───────────────────────────────────────────────────
        case 'settings':
            return <SettingsPane id={pane.id} />;
        case 'document':
            return <DocumentPane id={pane.id} />;
        case 'team':
            return <TeamPane id={pane.id} />;
        case 'notes':
            return <NotesPane id={pane.id} />;
        case 'finder':
            return <FinderPane id={pane.id} />;
        case 'space':
            // UNIFIED FINDER: Space pane uses FinderPane with spaceId context
            return <FinderPane id={pane.id} />;
        case 'chat':
            return <ChatPane id={pane.id} />;
        case 'meine-dateien':
            return <MeineDateienPane />;

        // ── Apps ────────────────────────────────────────────────────────
        case 'grid':
            return <GridPane id={pane.id} />;
        case 'search':
            return <SearchPane id={pane.id} />;
        case 'scanner':
            return <ScannerPane id={pane.id} />;
        case 'users':
            return <UsersPane id={pane.id} />;
        case 'company-detail':
            return (
                <CompanyDetailPane
                    id={pane.id}
                    companyId={pane.data?.companyId}
                    companyName={pane.data?.companyName}
                />
            );

        default:
            // Unknown or future-tier types — render nothing
            return null;
    }
};


export const PaneManager: React.FC = () => {
    const panes = usePaneStore((state) => state.panes);

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* GlassPanel uses createPortal → renders directly into document.body.
                This wrapper only holds the AnimatePresence; z-index is managed
                per-pane via the store (starting at 500, above all UI chrome). */}
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

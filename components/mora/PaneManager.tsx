'use client';

import React from 'react';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { SettingsPane } from '@/components/panes/SettingsPane';
import { AppLibraryPane } from '@/components/panes/AppLibraryPane';

import { GridPane } from '@/components/panes/GridPane';
// SpacePane replaced by FinderPane (Unified Finder)
// import { SpacePane } from '@/components/panes/SpacePane';
import { DocumentPane } from '@/components/panes/DocumentPane';
import { SearchPane } from '@/components/panes/SearchPane';
import { TeamPane } from '@/components/panes/TeamPane';
import { MailPane } from '@/components/panes/MailPane';
import { IntegrationsPane } from '@/components/panes/IntegrationsPane';
import { CalendarPane } from '@/components/panes/CalendarPane';
import { TerminalPane } from '@/components/panes/TerminalPane';
import { NotesPane } from '@/components/panes/NotesPane';
import { FinderPane } from '@/components/panes/FinderPane';
import { ScannerPane } from '@/components/panes/ScannerPane';
import { UsersPane } from '@/components/panes/UsersPane';
import { CompanyDetailPane } from '@/components/panes/CompanyDetailPane';
import { ChatPane } from '@/components/panes/ChatPane';
// import { TimelinePane } from '@/components/panes/TimelinePane';
import { MoraHubPane } from '@/components/panes/MoraHubPane';
import { ActionCenterPane } from '@/components/panes/ActionCenterPane';
import { WorkSessionPane } from '@/components/panes/WorkSessionPane';
import { MeineDateienPane } from '@/components/panes/MeineDateienPane';
import { AnimatePresence } from 'framer-motion';

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    switch (pane.type) {
        case 'settings':
            return <SettingsPane id={pane.id} />;
        case 'apps':
            return <AppLibraryPane id={pane.id} />;

        case 'grid':
            return <GridPane id={pane.id} />;
        case 'space':
            // UNIFIED FINDER: Space pane now uses FinderPane with spaceId context
            return <FinderPane id={pane.id} />;
        case 'document':
            return <DocumentPane id={pane.id} />;
        case 'search':
            return <SearchPane id={pane.id} />;
        case 'team':
            return <TeamPane id={pane.id} />;
        case 'mail':
            return <MailPane id={pane.id} />;
        case 'integrations':
            return <IntegrationsPane id={pane.id} />;
        case 'calendar':
            return <CalendarPane id={pane.id} />;
        case 'terminal':
            return <TerminalPane id={pane.id} />;
        case 'notes':
            return <NotesPane id={pane.id} />;
        case 'finder':
            return <FinderPane id={pane.id} />;
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
        case 'chat':
            return <ChatPane id={pane.id} />;
        // case 'timeline':
        //    return <TimelinePane id={pane.id} />;
        case 'mora-hub':
            return <MoraHubPane id={pane.id} data={pane.data} />;
        case 'actions':
            return <ActionCenterPane id={pane.id} />;
        case 'work-session':
            return <WorkSessionPane id={pane.id} />;
        case 'meine-dateien':
            return <MeineDateienPane />;
        default:
            // Fallback for unknown types
            return <AppLibraryPane id={pane.id} />;
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

'use client';

import React from 'react';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { SettingsPane } from '@/components/panes/SettingsPane';
import { AppLibraryPane } from '@/components/panes/AppLibraryPane';
import { FinderPane } from '@/components/panes/FinderPane';
import { NotesPane } from '@/components/panes/NotesPane';
import { ScannerPane } from '@/components/panes/ScannerPane';
import { GridPane } from '@/components/panes/GridPane';
import { SpacePane } from '@/components/panes/SpacePane';
import { IntegrationsPane } from '@/components/panes/IntegrationsPane';
import { DocumentPane } from '@/components/panes/DocumentPane';
import { SearchPane } from '@/components/panes/SearchPane';
import { UsersPane } from '@/components/panes/UsersPane';
import { CompanyDetailPane } from '@/components/panes/CompanyDetailPane';
import { MailPane } from '@/components/panes/MailPane';
import { TeamPane } from '@/components/panes/TeamPane';
import { CalendarPane } from '@/components/panes/CalendarPane';
import { TerminalPane } from '@/components/panes/TerminalPane';
import { AnimatePresence } from 'framer-motion';

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    switch (pane.type) {
        case 'settings':
            return <SettingsPane id={pane.id} />;
        case 'apps':
            return <AppLibraryPane id={pane.id} />;
        case 'finder':
            return <FinderPane id={pane.id} />;
        case 'notes':
            return <NotesPane id={pane.id} />;
        case 'scanner':
            return <ScannerPane id={pane.id} />;
        case 'grid':
            return <GridPane id={pane.id} />;
        case 'space':
            return <SpacePane id={pane.id} />;
        case 'integrations':
            return <IntegrationsPane id={pane.id} />;
        case 'document':
            return <DocumentPane id={pane.id} />;
        case 'search':
            return <SearchPane id={pane.id} />;
        case 'users':
            return <UsersPane id={pane.id} />;
        case 'company-detail':
            return <CompanyDetailPane
                id={pane.id}
                companyId={pane.data?.companyId || ''}
                companyName={pane.data?.companyName || 'Company'}
            />;
        case 'mail':
            return <MailPane id={pane.id} />;
        case 'team':
            return <TeamPane />;
        case 'calendar':
            return <CalendarPane id={pane.id} />;
        case 'terminal':
            return <TerminalPane id={pane.id} />;
        default:
            // Fallback for unknown types
            return <AppLibraryPane id={pane.id} />;
    }
};


export const PaneManager: React.FC = () => {
    const panes = usePaneStore((state) => state.panes);

    return (
        <div className="absolute inset-0 pointer-events-none z-[100]">
            {/* Panes layer needs pointer-events-none so clicks pass through to Universe 
                 BUT individual panes must re-enable pointer-events */}
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

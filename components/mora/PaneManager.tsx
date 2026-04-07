'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';

import { SettingsPane } from '@/components/panes/SettingsPane';
import { DocumentPane } from '@/components/panes/DocumentPane';
import { TeamPane } from '@/components/panes/TeamPane';
import { NotesPane } from '@/components/panes/NotesPane';
import { FinderPane } from '@/components/panes/FinderPane';
import { ChatPane } from '@/components/panes/ChatPane';
import { MeineDateienPane } from '@/components/panes/MeineDateienPane';

import { GridPane } from '@/components/panes/GridPane';
import { SearchPane } from '@/components/panes/SearchPane';
import { ScannerPane } from '@/components/panes/ScannerPane';
import { UsersPane } from '@/components/panes/UsersPane';
import { CompanyDetailPane } from '@/components/panes/CompanyDetailPane';
import { MoraHubPane } from '@/components/panes/MoraHubPane';

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    if (!isPaneEnabled(pane.type)) {
        return null;
    }

    switch (pane.type) {
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
            return <FinderPane id={pane.id} />;
        case 'chat':
            return <ChatPane id={pane.id} />;
        case 'meine-dateien':
            return <MeineDateienPane id={pane.id} />;

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
        case 'mora-hub':
            return <MoraHubPane id={pane.id} data={pane.data} />;
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

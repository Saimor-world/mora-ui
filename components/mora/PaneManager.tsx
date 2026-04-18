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
import { MailPane } from '@/components/panes/MailPane';
import { CalendarPane } from '@/components/panes/CalendarPane';
import { IntegrationsPane } from '@/components/panes/IntegrationsPane';
import { BrowserPane } from '@/components/panes/BrowserPane';
import { TasksPane }       from '@/components/panes/TasksPane';
import { TimelinePane }    from '@/components/panes/TimelinePane';
import { CanvasPane }      from '@/components/panes/CanvasPane';
import { AppLibraryPane }  from '@/components/panes/AppLibraryPane';

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
            return <FinderPane id={pane.id} data={pane.data} />;
        case 'space':
            return <FinderPane id={pane.id} data={pane.data} />;
        case 'chat':
            return <ChatPane id={pane.id} data={pane.data} />;
        case 'meine-dateien':
            return <MeineDateienPane id={pane.id} />;

        case 'grid':
            return <GridPane id={pane.id} />;
        case 'search':
            return <SearchPane id={pane.id} data={pane.data} />;
        case 'scanner':
            return <ScannerPane id={pane.id} data={pane.data} />;
        case 'users':
            return <UsersPane id={pane.id} />;
        case 'mail':
            return <MailPane id={pane.id} />;
        case 'calendar':
            return <CalendarPane id={pane.id} />;
        case 'integrations':
            return <IntegrationsPane id={pane.id} />;
        case 'browser':
            return <BrowserPane id={pane.id} />;
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
        case 'apps':
            return <AppLibraryPane id={pane.id} data={pane.data} />;
        case 'timeline':
            return <TimelinePane id={pane.id} data={pane.data} />;
        case 'tasks':
            return <TasksPane    id={pane.id} data={pane.data} />;
        case 'canvas':
            return <CanvasPane   id={pane.id} data={pane.data} />;
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

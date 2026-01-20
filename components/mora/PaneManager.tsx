'use client';

import React from 'react';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { SettingsPane } from '@/components/panes/SettingsPane';
import { AppLibraryPane } from '@/components/panes/AppLibraryPane';
import { FilesPane } from '@/components/panes/FilesPane';
import { GridPane } from '@/components/panes/GridPane';
import { SpacePane } from '@/components/panes/SpacePane';
import { DocumentPane } from '@/components/panes/DocumentPane';
import { SearchPane } from '@/components/panes/SearchPane';
import { AnimatePresence } from 'framer-motion';

const PaneRenderer: React.FC<{ pane: PaneConfig }> = ({ pane }) => {
    switch (pane.type) {
        case 'settings':
            return <SettingsPane id={pane.id} />;
        case 'apps':
            return <AppLibraryPane id={pane.id} />;
        case 'files':
            return <FilesPane id={pane.id} />;
        case 'grid':
            return <GridPane id={pane.id} />;
        case 'space':
            return <SpacePane id={pane.id} />;
        case 'document':
            return <DocumentPane id={pane.id} />;
        case 'search':
            return <SearchPane id={pane.id} />;
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

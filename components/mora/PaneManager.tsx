import React from 'react';
import { usePaneStore, PaneConfig } from '@/lib/store/paneStore';
import { SettingsPane } from '@/components/panes/SettingsPane';
import { AppLibraryPane } from '@/components/panes/AppLibraryPane';
import { FinderPane } from '@/components/panes/FinderPane';
import { NotesPane } from '@/components/panes/NotesPane';
import { ScannerPane } from '@/components/panes/ScannerPane';
import { GridPane } from '@/components/panes/GridPane';
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
        case 'document':
            return <AppLibraryPane id={pane.id} />;
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

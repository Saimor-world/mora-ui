import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { Folder } from 'lucide-react';

export const FinderPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Finder"
            width={900}
            height={600}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
        >
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <Folder size={64} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-medium text-white/80">Finder</h2>
                <p className="text-sm text-white/40 text-center max-w-md">
                    File browser coming soon.
                    <br />
                    Navigate folders, search files, and manage your workspace.
                </p>
            </div>
        </GlassPanel>
    );
};

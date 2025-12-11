import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { Grid } from 'lucide-react';

export const GridPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Grid View"
            width={1000}
            height={650}
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
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <Grid size={64} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-medium text-white/80">Grid View</h2>
                <p className="text-sm text-white/40 text-center max-w-md">
                    Visual grid layout coming soon.
                    <br />
                    View all nodes in a card grid with filters and quick actions.
                </p>
            </div>
        </GlassPanel>
    );
};

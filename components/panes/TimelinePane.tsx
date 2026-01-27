'use client';

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { MindLoopTimeline } from '@/components/timeline/MindLoopTimeline';

/**
 * P0-4: TimelinePane - Production wrapper for MindLoopTimeline
 *
 * Shows the chain of events for MÔRA's cognitive loop in a proper GlassPanel pane.
 */
export const TimelinePane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { activeCompanyId } = useMoraStore();
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="MindLoop Timeline"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onSizeChange={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            zIndex={pane.zIndex}
            minWidth={350}
            minHeight={400}
            paneId={id}
        >
            <MindLoopTimeline
                companyId={activeCompanyId || undefined}
                maxEvents={50}
                autoRefresh={true}
                refreshInterval={10000}
                compact={false}
            />
        </GlassPanel>
    );
};

export default TimelinePane;

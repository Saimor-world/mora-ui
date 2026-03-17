import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { EmailIntegration } from '@/components/integrations/EmailIntegration';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';

export const IntegrationsPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Integrations & Connectors"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-8">
                    <EmailIntegration />
                    <CalendarIntegration />
                </div>
            </div>
        </GlassPanel>
    );
};

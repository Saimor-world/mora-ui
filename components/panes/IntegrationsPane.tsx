import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { GoogleConnect } from '@/components/integrations/GoogleConnect';

export const IntegrationsPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Integrations & Connectors"
            width={600}
            height={500}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
        >
            <div className="p-6 h-full overflow-y-auto">
                <GoogleConnect />
            </div>
        </GlassPanel>
    );
};

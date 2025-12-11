import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { Zap } from 'lucide-react';

export const ScannerPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Scanner"
            width={800}
            height={550}
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
                <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <Zap size={64} className="text-purple-400" />
                </div>
                <h2 className="text-xl font-medium text-white/80">Scanner</h2>
                <p className="text-sm text-white/40 text-center max-w-md">
                    Document processing coming soon.
                    <br />
                    Upload files, extract text, and analyze documents with AI.
                </p>
            </div>
        </GlassPanel>
    );
};

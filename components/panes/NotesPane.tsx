import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { FileText } from 'lucide-react';

export const NotesPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Notes"
            width={700}
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
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                    <FileText size={64} className="text-yellow-400" />
                </div>
                <h2 className="text-xl font-medium text-white/80">Notes</h2>
                <p className="text-sm text-white/40 text-center max-w-md">
                    Quick note-taking coming soon.
                    <br />
                    Create, edit, and organize your thoughts seamlessly.
                </p>
            </div>
        </GlassPanel>
    );
};

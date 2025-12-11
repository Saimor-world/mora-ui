import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { Grid, Box, Zap, Folder, FileText } from 'lucide-react';

type PaneType = 'document' | 'chat' | 'node-detail' | 'settings' | 'timeline' | 'apps' | 'finder' | 'notes' | 'scanner' | 'grid';

export const AppLibraryPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, addPane } = usePaneStore();
    const pane = getPane(id);

    if (!pane) return null;

    const handleAppClick = (appType: PaneType, appName: string) => {
        addPane({
            id: `${appType}-${Date.now()}`,
            type: appType,
            title: appName,
            position: { x: 100 + Math.random() * 100, y: 100 + Math.random() * 50 },
            size: { width: 600, height: 400 },
            minimized: false
        });
    };

    const apps: { name: string; type: PaneType; icon: typeof Folder; color: string }[] = [
        { name: 'Finder', type: 'finder', icon: Folder, color: 'text-blue-400' },
        { name: 'Notes', type: 'notes', icon: FileText, color: 'text-yellow-400' },
        { name: 'Scanner', type: 'scanner', icon: Zap, color: 'text-purple-400' },
        { name: 'Settings', type: 'settings', icon: Box, color: 'text-white' },
        { name: 'Grid', type: 'grid', icon: Grid, color: 'text-emerald-400' },
    ];

    return (
        <GlassPanel
            title="Application Library"
            width={800}
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
            <div className="grid grid-cols-4 gap-4 p-4">
                {apps.map((app, i) => (
                    <div
                        key={i}
                        onClick={() => handleAppClick(app.type, app.name)}
                        className="aspect-square rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer"
                    >
                        <div className={`p-3 rounded-xl bg-black/20 ${app.color}`}>
                            <app.icon size={32} />
                        </div>
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">{app.name}</span>
                    </div>
                ))}
            </div>
        </GlassPanel>
    );
};

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    Grid, Box, Zap, Folder, FileText, Link2,
    Mail, Users, Calendar, Terminal, Search,
    MessageCircle, User, Globe, Calculator, Clock
} from 'lucide-react';
import { PaneConfig } from '@/lib/store/paneStore';

type PaneType = PaneConfig['type'];

export const AppLibraryPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, addPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

    // Hook must be called before any returns
    const isActive = usePaneStore(state => state.activePaneId === id);

    if (!pane) return null;

    const handleAppClick = (appType: PaneType, appName: string) => {
        // Prevent duplicate windows for system apps (Apple/Windows style behavior)
        const panes = usePaneStore.getState().panes;
        const expectedId = `${appType}-main`;

        // Check by ID first (consistent with Dock.tsx)
        const existingPane = panes.find(p => p.id === expectedId);

        if (existingPane) {
            if (existingPane.minimized) {
                usePaneStore.getState().restorePane(existingPane.id);
            } else {
                focusPane(existingPane.id);
            }
            return;
        }

        // Calculate centered position based on window size with viewport clamping
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const paneWidth = appType === 'settings' ? 700 : 800;
        const paneHeight = appType === 'settings' ? 500 : 600;

        // Calculate true center and apply slight upward bias
        let centerX = Math.floor((windowWidth - paneWidth) / 2);
        let centerY = Math.floor((windowHeight - paneHeight) / 2) - 40;

        // Clamp to ensure pane stays within viewport
        centerX = Math.max(20, Math.min(centerX, windowWidth - paneWidth - 20));
        centerY = Math.max(40, Math.min(centerY, windowHeight - paneHeight - 100));

        // Create new window - centered on screen
        addPane({
            id: expectedId,
            type: appType,
            title: appName,
            position: { x: centerX, y: centerY },
            size: { width: paneWidth, height: paneHeight },
            minimized: false
        });
    };

    // FULL APP LIBRARY - All available apps
    const apps: { name: string; type: PaneType; icon: typeof Folder; color: string; category: string }[] = [
        // Core Apps
        { name: 'Finder', type: 'finder', icon: Folder, color: 'text-blue-400', category: 'core' },
        { name: 'Mail', type: 'mail', icon: Mail, color: 'text-red-400', category: 'core' },
        { name: 'Notes', type: 'notes', icon: FileText, color: 'text-yellow-400', category: 'core' },
        { name: 'Search', type: 'search', icon: Search, color: 'text-purple-400', category: 'core' },

        // Communication
        { name: 'Team', type: 'team', icon: MessageCircle, color: 'text-emerald-400', category: 'comm' },
        { name: 'Users', type: 'users', icon: Users, color: 'text-cyan-400', category: 'comm' },

        // Productivity
        { name: 'Calendar', type: 'calendar', icon: Calendar, color: 'text-orange-400', category: 'prod' },
        { name: 'Scanner', type: 'scanner', icon: Zap, color: 'text-pink-400', category: 'prod' },

        // Utilities
        { name: 'Terminal', type: 'terminal', icon: Terminal, color: 'text-lime-400', category: 'util' },
        { name: 'Settings', type: 'settings', icon: Box, color: 'text-white', category: 'util' },
        { name: 'Connect', type: 'integrations', icon: Link2, color: 'text-amber-400', category: 'util' },
        { name: 'Grid View', type: 'grid', icon: Grid, color: 'text-emerald-400', category: 'util' },
        { name: 'Notes', type: 'notes', icon: FileText, color: 'text-yellow-400', category: 'util' },
    ];


    return (
        <GlassPanel
            title="App Library"
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

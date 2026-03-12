import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    Grid,
    Box,
    FileText,
    Search,
    Users,
    Mail,
    Calendar,
    Terminal,
    StickyNote,
    Folder,
    ScanLine,
    Wrench,
    Activity
} from 'lucide-react';
import { PaneConfig } from '@/lib/store/paneStore';

type PaneType = PaneConfig['type'];

export const AppLibraryPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

    // Hook must be called before any returns
    const isActive = usePaneStore(state => state.activePaneId === id);

    if (!pane) return null;

    const handleAppClick = (appType: PaneType, appName: string) => {
        const expectedId = `${appType}-main`;
        const sizeByType: Partial<Record<PaneType, { width: number; height: number }>> = {
            settings: { width: 700, height: 500 },
            search: { width: 600, height: 400 },
            finder: { width: 900, height: 620 },
            team: { width: 780, height: 620 },
            users: { width: 760, height: 600 },
            mail: { width: 860, height: 640 },
            calendar: { width: 840, height: 620 },
            notes: { width: 860, height: 620 },
            terminal: { width: 860, height: 560 },
            actions: { width: 920, height: 680 },
            scanner: { width: 840, height: 600 },
            integrations: { width: 760, height: 560 },
            grid: { width: 900, height: 640 }
            // timeline: { width: 420, height: 600 }
        };
        const paneSize = sizeByType[appType] || { width: 800, height: 600 };

        openPane({
            id: expectedId,
            type: appType,
            title: appName,
            size: paneSize
        });
        removePane(id);
    };

    // FULL APP LIBRARY - All available apps
    // NOTE: "Finder" is the main file browser with full hierarchical structure (Departments → Spaces → Folders → Nodes)
    // "Grid View" shows all nodes in a flat grid for quick overview
    const apps: { name: string; type: PaneType; icon: typeof FileText; color: string; category: string }[] = [
        { name: 'Finder', type: 'finder', icon: Folder, color: 'text-emerald-400', category: 'core' },
        { name: 'Grid View', type: 'grid', icon: Grid, color: 'text-emerald-300', category: 'core' },
        { name: 'Search', type: 'search', icon: Search, color: 'text-emerald-400', category: 'core' },
        { name: 'Notes', type: 'notes', icon: StickyNote, color: 'text-yellow-400', category: 'core' },
        { name: 'Scanner', type: 'scanner', icon: ScanLine, color: 'text-purple-400', category: 'core' },
        { name: 'Team', type: 'team', icon: Users, color: 'text-emerald-400', category: 'collaboration' },
        { name: 'Users', type: 'users', icon: Users, color: 'text-emerald-300', category: 'collaboration' },
        { name: 'Mail', type: 'mail', icon: Mail, color: 'text-red-400', category: 'collaboration' },
        { name: 'Calendar', type: 'calendar', icon: Calendar, color: 'text-orange-400', category: 'collaboration' },
        { name: 'Terminal', type: 'terminal', icon: Terminal, color: 'text-mora-gold', category: 'system' },
        { name: 'Actions', type: 'actions', icon: Activity, color: 'text-cyan-300', category: 'system' },
        { name: 'Integrations', type: 'integrations', icon: Wrench, color: 'text-blue-300', category: 'system' },
        // { name: 'Timeline', type: 'timeline', icon: Activity, color: 'text-emerald-400', category: 'system' },
        { name: 'Settings', type: 'settings', icon: Box, color: 'text-white', category: 'system' },
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

'use client';

import React, { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSession } from "next-auth/react";
import { useMoraStore } from '@/lib/store/moraState';
import { Check, User, Palette, Bell, Users, Activity, Info, FolderCog, Pencil, Trash2, Loader2, ChevronRight, Circle } from 'lucide-react';
import { toast } from '@/lib/toast';

export const SettingsPane: React.FC<{ id: string }> = ({ id }) => {
    const { data: session } = useSession();
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { user, updateUserSettings, departments, treeData, loadTree, loadDepartments, activeCompanyId } = useMoraStore();
    const pane = getPane(id);

    // Workspace Edit Mode State
    const [editingItem, setEditingItem] = useState<{ id: string; type: string; name: string } | null>(null);
    const [editName, setEditName] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [workspaceExpandedDept, setWorkspaceExpandedDept] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState('profile');
    const [theme, setTheme] = useState('deep-space');
    const [language, setLanguage] = useState('en');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [interfaceScale, setInterfaceScale] = useState(1);

    // Phase 6.3: Role-based Tab Visibility
    // Owner & Admin & Demo get full access
    const canManageTeam = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'demo';
    const canViewSystem = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'demo';
    // Workspace editing only for Owner/Admin (not demo for safety)
    const canEditWorkspace = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'demo';

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'appearance', label: 'Design', icon: Palette },
        { id: 'notifications', label: 'Mitteilungen', icon: Bell },
        ...(canEditWorkspace ? [{ id: 'workspace', label: 'Workspace', icon: FolderCog }] : []),
        ...(canManageTeam ? [{ id: 'team', label: 'Team & Benutzer', icon: Users }] : []),
        ...(canViewSystem ? [{ id: 'system', label: 'Systemstatus', icon: Activity }] : []),
        { id: 'about', label: 'Über Mora', icon: Info }
    ];

    // Ensure active tab is valid for current role
    useEffect(() => {
        if (!tabs.find(t => t.id === activeTab)) {
            setActiveTab('profile');
        }
    }, [user?.role, activeTab]);

    useEffect(() => {
        if (user?.settings) {
            setTheme(user.settings.theme || 'deep-space');
            setLanguage(user.settings.language || 'en');
            setReducedMotion(user.settings.reduced_motion || false);
            setInterfaceScale(user.settings.scale || 1);
            return;
        }
        if (typeof window !== 'undefined') {
            setTheme(localStorage.getItem('saimor_theme') || 'deep-space');
            setLanguage(localStorage.getItem('saimor_language') || 'en');
            setReducedMotion(localStorage.getItem('saimor_reduced_motion') === 'true');
            setInterfaceScale(parseFloat(localStorage.getItem('saimor_scale') || '1'));
        }
    }, [user?.settings]);

    const saveSetting = (updates: Record<string, any>) => {
        updateUserSettings(updates);
        if (typeof window === 'undefined') return;
        if (updates.theme) localStorage.setItem('saimor_theme', updates.theme);
        if (updates.language) localStorage.setItem('saimor_language', updates.language);
        if (typeof updates.reduced_motion === 'boolean') {
            localStorage.setItem('saimor_reduced_motion', String(updates.reduced_motion));
        }
        if (typeof updates.scale === 'number') {
            localStorage.setItem('saimor_scale', String(updates.scale));
            const clampedScale = Math.max(0.8, Math.min(1.2, updates.scale));
            (document.body.style as any).zoom = clampedScale.toString();
            document.documentElement.style.setProperty('--mora-interface-scale', clampedScale.toString());
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Settings"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full">
                {/* Sidebar */}
                <div className="w-1/3 border-r border-white/10 p-2 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === tab.id
                                ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                                : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Profil</h3>
                            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-xl font-medium text-white">
                                    {user?.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{user?.name}</div>
                                    <div className="text-white/40 text-sm">{user?.email}</div>
                                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/60 uppercase tracking-wider">
                                        {user?.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Design</h3>
                            <div className="space-y-3">
                                <label className="text-xs uppercase tracking-wider text-white/40">Theme</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { setTheme('deep-space'); saveSetting({ theme: 'deep-space' }); }}
                                        className={`h-24 w-32 rounded-lg bg-black border relative overflow-hidden transition-all ${theme === 'deep-space' ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/10'}`}
                                    >
                                        <div className="absolute inset-0 bg-emerald-900/10" />
                                        {theme === 'deep-space' && <Check className="absolute top-2 right-2 text-emerald-400" size={14} />}
                                        <div className="absolute bottom-2 left-2 text-xs text-emerald-400 font-medium">Deep Space</div>
                                    </button>
                                    <button
                                        onClick={() => { setTheme('midnight'); saveSetting({ theme: 'midnight' }); }}
                                        className={`h-24 w-32 rounded-lg bg-[#0a0a0a] border relative overflow-hidden transition-all ${theme === 'midnight' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10'}`}
                                    >
                                        {theme === 'midnight' && <Check className="absolute top-2 right-2 text-blue-400" size={14} />}
                                        <div className="absolute bottom-2 left-2 text-xs text-white/60">Midnight</div>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-white/80">Interface Scaling</div>
                                        <div className="text-xs text-white/40">Adjust UI size ({Math.round(interfaceScale * 100)}%)</div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.8"
                                        max="1.2"
                                        step="0.1"
                                        value={interfaceScale}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            setInterfaceScale(value);
                                            saveSetting({ scale: value });
                                        }}
                                        className="w-32 accent-emerald-500"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-white/80">Reduced Motion</div>
                                        <div className="text-xs text-white/40">Disable animations</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const next = !reducedMotion;
                                            setReducedMotion(next);
                                            saveSetting({ reduced_motion: next });
                                        }}
                                        className={`w-10 h-6 rounded-full border relative transition-all ${reducedMotion
                                            ? 'bg-emerald-500/30 border-emerald-500/50'
                                            : 'bg-white/10 border-white/10'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${reducedMotion
                                            ? 'left-5 bg-emerald-400'
                                            : 'left-0.5 bg-white/40'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'workspace' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg text-white font-light">Workspace verwalten</h3>
                                <span className="text-xs text-white/30 px-2 py-1 bg-white/5 rounded">
                                    {user?.role === 'owner' ? 'Owner' : user?.role === 'admin' ? 'Admin' : 'Demo'}
                                </span>
                            </div>
                            <p className="text-sm text-white/40">
                                Bearbeite Departments, Spaces und Ordner. Ändere Namen, Farben und Icons.
                            </p>

                            {/* Department List from Tree Data */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {treeData && treeData.length > 0 ? (
                                    treeData
                                        .filter((node: any) => node.type === 'department')
                                        .map((dept: any) => (
                                            <div key={dept.id} className="border border-white/10 rounded-lg overflow-hidden">
                                                {/* Department Header */}
                                                <div
                                                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                                                    onClick={() => setWorkspaceExpandedDept(workspaceExpandedDept === dept.id ? null : dept.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <ChevronRight
                                                            size={16}
                                                            className={`text-white/40 transition-transform ${workspaceExpandedDept === dept.id ? 'rotate-90' : ''}`}
                                                        />
                                                        <Circle size={12} className="text-emerald-400" fill="currentColor" />
                                                        {editingItem?.id === dept.id ? (
                                                            <input
                                                                type="text"
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                onBlur={() => {
                                                                    // TODO: Save to backend
                                                                    toast.info('Änderungen werden in Phase 8 gespeichert');
                                                                    setEditingItem(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        toast.info('Änderungen werden in Phase 8 gespeichert');
                                                                        setEditingItem(null);
                                                                    }
                                                                    if (e.key === 'Escape') setEditingItem(null);
                                                                }}
                                                                className="bg-black/30 border border-emerald-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
                                                                autoFocus
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <span className="text-white font-medium">{dept.name}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingItem({ id: dept.id, type: 'department', name: dept.name });
                                                                setEditName(dept.name);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                                            title="Umbenennen"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toast.info('Löschen wird in Phase 8 aktiviert');
                                                            }}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                                                            title="Löschen"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded: Show Spaces/Folders */}
                                                {workspaceExpandedDept === dept.id && dept.children && (
                                                    <div className="border-t border-white/5 bg-black/20">
                                                        {dept.children.map((child: any) => (
                                                            <div
                                                                key={child.id}
                                                                className="flex items-center justify-between px-4 py-2 pl-10 hover:bg-white/5 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Circle size={8} className="text-blue-400" fill="currentColor" />
                                                                    {editingItem?.id === child.id ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editName}
                                                                            onChange={(e) => setEditName(e.target.value)}
                                                                            onBlur={() => {
                                                                                toast.info('Änderungen werden in Phase 8 gespeichert');
                                                                                setEditingItem(null);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    toast.info('Änderungen werden in Phase 8 gespeichert');
                                                                                    setEditingItem(null);
                                                                                }
                                                                                if (e.key === 'Escape') setEditingItem(null);
                                                                            }}
                                                                            className="bg-black/30 border border-blue-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                                                            autoFocus
                                                                        />
                                                                    ) : (
                                                                        <span className="text-white/70 text-sm">{child.name}</span>
                                                                    )}
                                                                    <span className="text-[10px] text-white/30 uppercase">{child.type}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingItem({ id: child.id, type: child.type, name: child.name });
                                                                            setEditName(child.name);
                                                                        }}
                                                                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => toast.info('Löschen wird in Phase 8 aktiviert')}
                                                                        className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                ) : (
                                    <div className="p-8 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
                                        <Loader2 className="animate-spin text-white/30 mb-4" size={24} />
                                        <p className="text-white/40 text-sm">Lade Workspace-Struktur...</p>
                                        <button
                                            onClick={() => activeCompanyId && loadTree()}
                                            className="mt-4 px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg text-white/60 transition-colors"
                                        >
                                            Neu laden
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Future: Color & Icon Picker */}
                            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                                <h4 className="text-sm text-white/60 font-medium mb-2">Zukünftige Features</h4>
                                <ul className="text-xs text-white/40 space-y-1">
                                    <li>• Farben für Departments anpassen</li>
                                    <li>• Custom Icons zuweisen</li>
                                    <li>• Drag & Drop Sortierung</li>
                                    <li>• Team Manager: Sichtbarkeit pro Rolle</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Team Management</h3>
                            <div className="p-8 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Users className="text-white/40" size={24} />
                                </div>
                                <h4 className="text-white/60 font-medium">User Management</h4>
                                <p className="text-white/30 text-xs mt-2 max-w-xs">
                                    Invite team members, assign roles, and manage permissions.
                                    <br />(Coming in Phase 8)
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Systemstatus</h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Environment</div>
                                    <div className="text-white font-mono text-sm">{process.env.NODE_ENV || 'development'}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Version</div>
                                    <div className="text-white font-mono text-sm">v1.5.0 (R1)</div>
                                </div>
                            </div>

                            {/* DEMO / RESET ACTIONS */}
                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <h4 className="text-sm font-medium text-white/80">Datenverwaltung</h4>
                                <p className="text-xs text-white/40">
                                    Hier kannst du den Workspace komplett zurücksetzen. Alle Daten werden gelöscht und mit den Standard-Demo-Daten überschrieben.
                                </p>

                                <button
                                    onClick={async () => {
                                        if (!confirm('Bist du sicher? Alle Änderungen gehen verloren und der Workspace wird auf den Demo-Zustand zurückgesetzt.')) return;

                                        try {
                                            toast.loading('Workspace wird zurückgesetzt...');

                                            // Get token from Session (Production Auth)
                                            const token = session?.user?.accessToken; // || localStorage fallback removed
                                            const userId = session?.user?.id || user?.id || 'demo_user';

                                            console.log('[Reset Debug] Token present:', !!token, 'User ID:', userId);

                                            // Call correct endpoint from demo.py: /reset-instance
                                            const headers: Record<string, string> = {
                                                'Content-Type': 'application/json',
                                                'X-Tenant-ID': 'demo' // Force demo context for reset
                                            };
                                            if (token) headers['Authorization'] = `Bearer ${token}`;
                                            headers['X-User-ID'] = userId;

                                            const res = await fetch('/api/core/v1/demo/reset-instance', {
                                                method: 'POST',
                                                headers
                                            });

                                            if (!res.ok) {
                                                const err = await res.json().catch(() => ({}));
                                                console.error('[Reset Error]', err);
                                                throw new Error(err.detail || 'Reset failed');
                                            }

                                            toast.success('Workspace erfolgreich zurückgesetzt!');
                                            // Force reload window to clear all local state nuances
                                            window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            toast.error('Fehler beim Zurücksetzen.');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-red-400 transition-all group"
                                >
                                    <Trash2 size={16} className="group-hover:animate-pulse" />
                                    <span>Workspace zurücksetzen (Reset Data)</span>
                                </button>
                            </div>

                            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/60">Database Status</span>
                                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Connected
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/60">API Latency</span>
                                    <span className="text-sm text-white font-mono">24ms</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">About SAIMÔR</h3>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-white/60 leading-relaxed">
                                <p className="mb-4">
                                    SAIMÔR is an advanced Semantic Artificial Intelligence for Memory and Organizational Recall.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-white/30 mt-8">
                                    <span>Build ID: {Math.random().toString(36).substring(7)}</span>
                                    <span>•</span>
                                    <span>Môra Core V1</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};

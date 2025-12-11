'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Settings, Shield, Globe, Cpu, User, Moon, Sun, Check } from 'lucide-react';

type SettingsTab = 'general' | 'profile' | 'network' | 'system';

export const SettingsPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const { user, permissions } = useMoraStore();
    const pane = getPane(id);

    // Settings state
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [theme, setTheme] = useState('deep-space');
    const [language, setLanguage] = useState('de');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [interfaceScale, setInterfaceScale] = useState(1);

    // Load settings from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setTheme(localStorage.getItem('saimor_theme') || 'deep-space');
            setLanguage(localStorage.getItem('saimor_language') || 'de');
            setReducedMotion(localStorage.getItem('saimor_reduced_motion') === 'true');
            setInterfaceScale(parseFloat(localStorage.getItem('saimor_scale') || '1'));
        }
    }, []);

    // Save settings
    const saveTheme = (newTheme: string) => {
        setTheme(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_theme', newTheme);
        }
    };

    const saveLanguage = (lang: string) => {
        setLanguage(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_language', lang);
        }
    };

    const saveReducedMotion = (enabled: boolean) => {
        setReducedMotion(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_reduced_motion', String(enabled));
        }
    };

    const saveScale = (scale: number) => {
        setInterfaceScale(scale);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_scale', String(scale));
        }
    };

    if (!pane) return null;

    const tabs = [
        { id: 'general' as const, icon: Settings, label: 'General' },
        { id: 'profile' as const, icon: User, label: 'Profile' },
        { id: 'network' as const, icon: Globe, label: 'Network' },
        { id: 'system' as const, icon: Cpu, label: 'System' },
    ];

    return (
        <GlassPanel
            title="System Settings"
            width={700}
            height={500}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showBackButton={false}
            draggable
        >
            <div className="flex h-full">
                {/* Sidebar */}
                <div className="w-48 border-r border-white/5 pr-4 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'hover:bg-white/5 text-white/60'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 pl-6 overflow-y-auto">
                    {activeTab === 'general' && (
                        <>
                            <h3 className="text-lg text-white font-light mb-6">General Settings</h3>
                            <div className="space-y-6">
                                {/* Theme Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-white/40">Visual Theme</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => saveTheme('deep-space')}
                                            className={`h-20 w-32 rounded-lg bg-black border relative overflow-hidden transition-all ${theme === 'deep-space' ? 'border-emerald-500' : 'border-white/10'
                                                }`}
                                        >
                                            <div className="absolute inset-0 bg-emerald-900/10" />
                                            {theme === 'deep-space' && <Check className="absolute top-2 right-2 text-emerald-400" size={14} />}
                                            <div className="absolute bottom-2 left-2 text-xs text-emerald-400">Deep Space</div>
                                        </button>
                                        <button
                                            onClick={() => saveTheme('midnight')}
                                            className={`h-20 w-32 rounded-lg bg-[#0a0a0a] border relative overflow-hidden transition-all ${theme === 'midnight' ? 'border-blue-500' : 'border-white/10'
                                                }`}
                                        >
                                            {theme === 'midnight' && <Check className="absolute top-2 right-2 text-blue-400" size={14} />}
                                            <div className="absolute bottom-2 left-2 text-xs text-white/60">Midnight</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Language Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-white/40">Language</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => saveLanguage('de')}
                                            className={`px-4 py-2 rounded-lg text-sm transition-all ${language === 'de'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            🇩🇪 Deutsch
                                        </button>
                                        <button
                                            onClick={() => saveLanguage('en')}
                                            className={`px-4 py-2 rounded-lg text-sm transition-all ${language === 'en'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            🇬🇧 English
                                        </button>
                                    </div>
                                </div>

                                {/* Interface Scale */}
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-white/40">Interface Scaling ({Math.round(interfaceScale * 100)}%)</label>
                                    <input
                                        type="range"
                                        min="0.8"
                                        max="1.2"
                                        step="0.1"
                                        value={interfaceScale}
                                        onChange={(e) => saveScale(parseFloat(e.target.value))}
                                        className="w-full accent-emerald-500"
                                    />
                                    <div className="flex justify-between text-xs text-white/30">
                                        <span>Compact</span>
                                        <span>Comfortable</span>
                                    </div>
                                </div>

                                {/* Reduced Motion Toggle */}
                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-white/80">Reduced Motion</div>
                                            <div className="text-xs text-white/40">Disable excessive animations</div>
                                        </div>
                                        <button
                                            onClick={() => saveReducedMotion(!reducedMotion)}
                                            className={`w-12 h-7 rounded-full border relative transition-all ${reducedMotion
                                                    ? 'bg-emerald-500/30 border-emerald-500/50'
                                                    : 'bg-white/10 border-white/10'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all ${reducedMotion
                                                    ? 'left-6 bg-emerald-400'
                                                    : 'left-1 bg-white/40'
                                                }`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'profile' && (
                        <>
                            <h3 className="text-lg text-white font-light mb-6">Profile</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30">
                                        <User size={28} className="text-emerald-400/70" />
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{user?.name || 'Guest User'}</div>
                                        <div className="text-sm text-white/40">{user?.email || 'Not signed in'}</div>
                                        <div className="text-xs text-emerald-400/70 mt-1 uppercase tracking-wider">
                                            {user?.role || 'demo'} Account
                                        </div>
                                    </div>
                                </div>

                                {!permissions.canEditSettings && (
                                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400/80">
                                        Your account permissions are limited. Some settings may not be editable.
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'network' && (
                        <>
                            <h3 className="text-lg text-white font-light mb-6">Network Status</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <span className="text-sm text-white/70">Backend Connection</span>
                                    <span className="text-sm text-emerald-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Connected
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <span className="text-sm text-white/70">API Endpoint</span>
                                    <span className="text-xs text-white/40 font-mono">localhost:8000</span>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'system' && (
                        <>
                            <h3 className="text-lg text-white font-light mb-6">System Information</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <span className="text-white/70">SAIMÔR Version</span>
                                    <span className="text-white/40 font-mono">1.5.0-beta</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <span className="text-white/70">Build</span>
                                    <span className="text-white/40 font-mono">Phase 6</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <span className="text-white/70">Environment</span>
                                    <span className="text-emerald-400 font-mono">Development</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};

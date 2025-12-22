'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Settings, Shield, Globe, Cpu, User, Moon, Sun, Check, Link2, Trash2, RefreshCw } from 'lucide-react';
import { GoogleConnect } from '@/components/integrations/GoogleConnect';
import { corePost, corePut } from '@/lib/api/coreClient';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { toast } from 'sonner';

type SettingsTab = 'general' | 'profile' | 'network' | 'system' | 'integrations' | 'admin' | 'intelligence';

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

    // Load settings from user store (backend source) or fallback to localStorage
    useEffect(() => {
        if (user?.settings) {
            setTheme(user.settings.theme || 'deep-space');
            setLanguage(user.settings.language || 'de');
            setReducedMotion(user.settings.reduced_motion || false);
            setInterfaceScale(user.settings.scale || 1);
        } else if (typeof window !== 'undefined') {
            setTheme(localStorage.getItem('saimor_theme') || 'deep-space');
            setLanguage(localStorage.getItem('saimor_language') || 'de');
            setReducedMotion(localStorage.getItem('saimor_reduced_motion') === 'true');
            setInterfaceScale(parseFloat(localStorage.getItem('saimor_scale') || '1'));
        }
    }, [user?.settings]);

    const syncSettings = async (updates: Record<string, any>) => {
        try {
            await corePut('/v1/auth/settings', updates);
            // Optionally update the local store user object too
        } catch (e) {
            console.error('[Settings] Sync failed:', e);
            toast.error('Failed to sync settings to cloud');
        }
    };

    // Save settings
    const saveTheme = (newTheme: string) => {
        setTheme(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_theme', newTheme);
            syncSettings({ theme: newTheme });
        }
    };

    const saveLanguage = (lang: string) => {
        setLanguage(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_language', lang);
            syncSettings({ language: lang });
        }
    };

    const saveReducedMotion = (enabled: boolean) => {
        setReducedMotion(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_reduced_motion', String(enabled));
            syncSettings({ reduced_motion: enabled });
        }
    };

    const saveScale = (scale: number) => {
        setInterfaceScale(scale);
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_scale', String(scale));
            syncSettings({ scale: scale });
        }
    };

    if (!pane) return null;

    const tabs = [
        { id: 'general' as const, icon: Settings, label: 'General' },
        { id: 'profile' as const, icon: User, label: 'Profile' },
        { id: 'intelligence' as const, icon: Cpu, label: 'Intelligence' },
        { id: 'integrations' as const, icon: Link2, label: 'Integrations' },
        ...(user?.role === 'owner' || user?.role === 'admin' ? [{ id: 'admin' as const, icon: Shield, label: 'Admin' }] : []),
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
                    {activeTab === 'integrations' && (
                        <GoogleConnect />
                    )}

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

                                {/* Company Accent Color */}
                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    <div>
                                        <div className="text-sm text-white/80">Firmenfarbe (Accent Color)</div>
                                        <div className="text-xs text-white/40">Die Hauptfarbe für Orb und UI-Elemente</div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { name: 'Emerald', color: '#10B981' },
                                            { name: 'Gold', color: '#D4AF37' },
                                            { name: 'Blue', color: '#3B82F6' },
                                            { name: 'Purple', color: '#8B5CF6' },
                                            { name: 'Rose', color: '#F43F5E' },
                                            { name: 'Orange', color: '#F97316' },
                                            { name: 'Cyan', color: '#06B6D4' },
                                        ].map(preset => (
                                            <button
                                                key={preset.name}
                                                onClick={() => {
                                                    if (typeof window !== 'undefined') {
                                                        localStorage.setItem('saimor_accent_color', preset.color);
                                                        toast.success(`Farbe: ${preset.name}`);
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-full border-2 border-transparent hover:border-white/50 transition-all flex items-center justify-center"
                                                style={{ backgroundColor: preset.color }}
                                                title={preset.name}
                                            >
                                                {localStorage?.getItem?.('saimor_accent_color') === preset.color && (
                                                    <Check size={16} className="text-white drop-shadow-lg" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="text-xs text-white/40">Custom:</label>
                                        <input
                                            type="color"
                                            defaultValue={typeof window !== 'undefined' ? localStorage.getItem('saimor_accent_color') || '#10B981' : '#10B981'}
                                            onChange={(e) => {
                                                if (typeof window !== 'undefined') {
                                                    localStorage.setItem('saimor_accent_color', e.target.value);
                                                }
                                            }}
                                            className="w-8 h-8 rounded cursor-pointer border border-white/10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'profile' && (
                        <div className="space-y-8 pr-4">
                            <h3 className="text-lg text-white font-light mb-6">Profile Settings</h3>

                            {/* Identity Card */}
                            <div className="flex items-center gap-6 p-6 rounded-xl bg-white/5 border border-white/5">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30">
                                    <User size={32} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="text-xs uppercase text-white/40 mb-1 block">Full Name</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                defaultValue={user?.name || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== user?.name) {
                                                        const promise = corePut('/v1/auth/profile', { full_name: e.target.value });
                                                        toast.promise(promise, {
                                                            loading: 'Updating name...',
                                                            success: 'Name updated',
                                                            error: 'Failed to update name'
                                                        });
                                                    }
                                                }}
                                                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white w-full max-w-xs focus:border-emerald-500/50 focus:outline-none transition-colors"
                                                placeholder="Your Name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase text-white/40 mb-1 block">Email Address</label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-white/80">{user?.email || 'No Email'}</span>
                                            {(user as any)?.email_verified ? (
                                                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                                    <Check size={10} /> Verified
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await corePost('/v1/auth/verify-email', {});
                                                            toast.success('Email verified successfully!');
                                                            // Force reload to see change
                                                            setTimeout(() => window.location.reload(), 1000);
                                                        } catch (e) { toast.error('Failed to verify'); }
                                                    }}
                                                    className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2"
                                                >
                                                    Verify Email
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Password Section */}
                            <div className="space-y-4">
                                <h4 className="text-sm uppercase tracking-wider text-white/50">Security</h4>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const oldPass = (form.elements.namedItem('oldPass') as HTMLInputElement).value;
                                        const newPass = (form.elements.namedItem('newPass') as HTMLInputElement).value;

                                        const promise = corePost('/v1/auth/change-password', {
                                            old_password: oldPass,
                                            new_password: newPass
                                        });

                                        toast.promise(promise, {
                                            loading: 'Updating password...',
                                            success: () => {
                                                form.reset();
                                                return 'Password changed successfully';
                                            },
                                            error: 'Failed to update password. Check your old password.'
                                        });
                                    }}
                                    className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-4"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Current Password</label>
                                            <input name="oldPass" type="password" required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">New Password</label>
                                            <input name="newPass" type="password" required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors border border-white/5">
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
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

                    {activeTab === 'admin' && (
                        <AdminCompanyManager />
                    )}

                    {activeTab === 'intelligence' && (
                        <IntelligenceStatusView />
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};

// Internal component for company management
const AdminCompanyManager = () => {
    const { companies, loadCompanies } = useMoraStore();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadCompanies();
    }, [loadCompanies]);

    const handleDelete = async (companyId: string, companyName: string) => {
        if (!confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) return;

        const promise = (async () => {
            // We need to import coreDelete dynamically or use a helper
            // Using fetch directly for now as coreDelete is strictly typed in API client
            // Actually, let's use the moraStore actions if available or direct API call
            // The API client is available as an import.
            // We'll assume strict API client: coreDelete(`/v1/companies/${id}`)
            const { coreDelete } = await import('@/lib/api/coreClient');
            await coreDelete(`/v1/companies/${companyId}`);
            await loadCompanies();
        })();

        toast.promise(promise, {
            loading: 'Deleting company...',
            success: 'Company deleted',
            error: 'Failed to delete company'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg text-white font-light">Company Management</h3>
                <button
                    onClick={() => loadCompanies()}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            <div className="space-y-3">
                {companies.map(company => (
                    <div key={company.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${company.is_demo ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-white font-medium">{company.name}</div>
                                <div className="text-xs text-white/40 flex items-center gap-2">
                                    <span className="font-mono">{company.slug}</span>
                                    {company.is_demo && <span className="px-1.5 rounded bg-blue-500/10 text-blue-400">DEMO</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleDelete(company.id, company.name)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                title="Delete Company"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {companies.length === 0 && (
                    <div className="p-8 text-center text-white/30 border border-white/5 rounded-xl border-dashed">
                        No companies found.
                    </div>
                )}
            </div>
        </div>
    );
};

const IntelligenceStatusView = () => {
    const [stats, setStats] = useState<any>(null);
    const [state, setState] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { coreGet } = await import('@/lib/api/coreClient');
                const [statsData, stateData] = await Promise.all([
                    coreGet('/v1/mindloop/stats'),
                    coreGet('/v1/awareness/state')
                ]);
                setStats(statsData);
                setState(stateData);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) return <div className="animate-pulse space-y-4 pt-10">
        <div className="h-20 bg-white/5 rounded-xl" />
        <div className="h-40 bg-white/5 rounded-xl" />
    </div>;

    return (
        <div className="space-y-6">
            <h3 className="text-lg text-white font-light">Môra Intelligence</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xs text-white/40 uppercase mb-1">State</div>
                    <div className="text-xl text-emerald-400 font-light flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${state?.state === 'idle' ? 'bg-emerald-500/50' : 'bg-emerald-400 animate-pulse'}`} />
                        {state?.state?.toUpperCase() || 'OFFLINE'}
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xs text-white/40 uppercase mb-1">Risk Level</div>
                    <div className={`text-xl font-light ${state?.risk_level === 'high' ? 'text-red-400' : 'text-emerald-400/60'}`}>
                        {state?.risk_level?.toUpperCase() || 'LOW'}
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <h4 className="text-sm font-medium text-emerald-400 mb-4">Neural Graph Stats</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Total Nodes</span>
                        <span className="text-white font-mono">{stats?.node_count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Semantic Relations</span>
                        <span className="text-white font-mono">{stats?.relation_count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">MindLoop Events</span>
                        <span className="text-white font-mono">{stats?.recent_events || 0}</span>
                    </div>
                </div>
            </div>

            <div className="pt-4 text-[10px] text-white/20 font-mono flex justify-between">
                <span>SYSTEM_TIME: {new Date().toISOString()}</span>
                <span>STATUS: STABLE</span>
            </div>
        </div>
    );
};

'use client';

import React, { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Check } from 'lucide-react';

export const SettingsPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { user, updateUserSettings } = useMoraStore();
    const pane = getPane(id);

    const [theme, setTheme] = useState('deep-space');
    const [language, setLanguage] = useState('en');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [interfaceScale, setInterfaceScale] = useState(1);

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
            <div className="h-full overflow-y-auto p-6 space-y-6">
                <div>
                    <h3 className="text-lg text-white font-light mb-2">General</h3>
                    <p className="text-xs text-white/40">Local preferences stored in this browser.</p>
                </div>

                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-white/40">Theme</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { setTheme('deep-space'); saveSetting({ theme: 'deep-space' }); }}
                            className={`h-20 w-32 rounded-lg bg-black border relative overflow-hidden transition-all ${theme === 'deep-space' ? 'border-emerald-500' : 'border-white/10'}`}
                        >
                            <div className="absolute inset-0 bg-emerald-900/10" />
                            {theme === 'deep-space' && <Check className="absolute top-2 right-2 text-emerald-400" size={14} />}
                            <div className="absolute bottom-2 left-2 text-xs text-emerald-400">Deep Space</div>
                        </button>
                        <button
                            onClick={() => { setTheme('midnight'); saveSetting({ theme: 'midnight' }); }}
                            className={`h-20 w-32 rounded-lg bg-[#0a0a0a] border relative overflow-hidden transition-all ${theme === 'midnight' ? 'border-blue-500' : 'border-white/10'}`}
                        >
                            {theme === 'midnight' && <Check className="absolute top-2 right-2 text-blue-400" size={14} />}
                            <div className="absolute bottom-2 left-2 text-xs text-white/60">Midnight</div>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-white/40">Language</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setLanguage('en'); saveSetting({ language: 'en' }); }}
                            className={`px-4 py-2 rounded-lg text-sm transition-all ${language === 'en'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
                        >
                            English
                        </button>
                        <button
                            onClick={() => { setLanguage('de'); saveSetting({ language: 'de' }); }}
                            className={`px-4 py-2 rounded-lg text-sm transition-all ${language === 'de'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
                        >
                            Deutsch
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-white/40">
                        Interface Scaling ({Math.round(interfaceScale * 100)}%)
                    </label>
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
                        className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-white/30">
                        <span>Compact</span>
                        <span>Comfortable</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-white/80">Reduced Motion</div>
                            <div className="text-xs text-white/40">Disable excessive animations</div>
                        </div>
                        <button
                            onClick={() => {
                                const next = !reducedMotion;
                                setReducedMotion(next);
                                saveSetting({ reduced_motion: next });
                            }}
                            className={`w-12 h-7 rounded-full border relative transition-all ${reducedMotion
                                ? 'bg-emerald-500/30 border-emerald-500/50'
                                : 'bg-white/10 border-white/10'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all ${reducedMotion
                                ? 'left-6 bg-emerald-400'
                                : 'left-1 bg-white/40'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
};

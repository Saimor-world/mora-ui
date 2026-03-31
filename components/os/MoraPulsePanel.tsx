'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Clock3,
    Compass,
    FileText,
    FolderOpen,
    MessageCircle,
    Music2,
    Pause,
    Play,
    Settings2,
    SkipForward,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT,
    listAmbientAudioTracks,
    persistAmbientAudioSettings,
    resolveAmbientAudioSettings,
    type AmbientAudioTrackMeta,
} from '@/lib/audio/ambientAudio';

type QuickAction = {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
};

const ORB_LABELS: Record<string, string> = {
    idle: 'Standby',
    thinking: 'Thinking',
    insight: 'Insight',
    focus: 'Focus',
    alert: 'Alert',
    demo: 'Demo',
};

const VIEW_LEVEL_LABELS: Record<string, string> = {
    company: 'Portfolio',
    core: 'Universe',
    department: 'Department',
    space: 'Space',
    folder: 'Folder',
};

const formatClock = (value: Date) => new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
}).format(value);

const formatDateLabel = (value: Date) => new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
}).format(value);

const getRitualLabel = (hour: number) => {
    if (hour >= 5 && hour < 11) return 'Morning ignition';
    if (hour >= 11 && hour < 17) return 'Build window';
    if (hour >= 17 && hour < 22) return 'Deep run';
    return 'Night lab';
};

export const MoraPulsePanel: React.FC = () => {
    const user = useMoraStore((state) => state.user);
    const companies = useMoraStore((state) => state.companies);
    const activeCompanyId = useMoraStore((state) => state.activeCompanyId);
    const orbState = useMoraStore((state) => state.orbState);
    const viewLevel = useMoraStore((state) => state.viewLevel);
    const updateUserSettings = useMoraStore((state) => state.updateUserSettings);
    const openPane = usePaneStore((state) => state.openPane);

    const [now, setNow] = useState(() => new Date());
    const [ambientTracks, setAmbientTracks] = useState<AmbientAudioTrackMeta[]>([]);

    const ambientAudio = useMemo(() => resolveAmbientAudioSettings(user?.settings), [user?.settings]);
    const activeCompany = useMemo(
        () => companies.find((company) => company.id === activeCompanyId) ?? null,
        [companies, activeCompanyId]
    );
    const activeTrack = useMemo(
        () => ambientTracks.find((track) => track.id === ambientAudio.trackId) ?? null,
        [ambientTracks, ambientAudio.trackId]
    );

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadTracks = async () => {
            try {
                const tracks = await listAmbientAudioTracks();
                if (!cancelled) {
                    setAmbientTracks(tracks);
                }
            } catch (error) {
                console.error('[PulsePanel] Failed to load ambient tracks:', error);
            }
        };

        loadTracks();
        window.addEventListener('focus', loadTracks);
        window.addEventListener(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT, loadTracks);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', loadTracks);
            window.removeEventListener(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT, loadTracks);
        };
    }, []);

    const quickActions = useMemo<QuickAction[]>(() => [
        {
            id: 'chat',
            label: 'Chat',
            icon: MessageCircle,
            onClick: () => openPane({ id: 'chat-main', type: 'chat', title: 'Mora', size: { width: 860, height: 680 } }),
        },
        {
            id: 'finder',
            label: 'Finder',
            icon: FolderOpen,
            onClick: () => openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } }),
        },
        {
            id: 'notes',
            label: 'Notes',
            icon: FileText,
            onClick: () => openPane({ id: 'notes-main', type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } }),
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings2,
            onClick: () => openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } }),
        },
    ], [openPane]);

    const handleAmbientToggle = () => {
        if (!ambientAudio.trackId) {
            const firstTrack = ambientTracks[0];
            if (!firstTrack) {
                openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } });
                return;
            }

            persistAmbientAudioSettings(updateUserSettings, {
                ambientAudioTrackId: firstTrack.id,
                ambientAudioEnabled: true,
            });
            return;
        }

        persistAmbientAudioSettings(updateUserSettings, {
            ambientAudioEnabled: !ambientAudio.enabled,
        });
    };

    const handleAmbientNext = () => {
        if (ambientTracks.length === 0) {
            openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } });
            return;
        }

        const currentIndex = ambientTracks.findIndex((track) => track.id === ambientAudio.trackId);
        const nextTrack = ambientTracks[(currentIndex + 1 + ambientTracks.length) % ambientTracks.length];

        persistAmbientAudioSettings(updateUserSettings, {
            ambientAudioTrackId: nextTrack.id,
            ambientAudioEnabled: true,
        });
    };

    return (
        <div className="pointer-events-none fixed right-6 top-6 z-[78] hidden w-[360px] lg:block">
            <div className="pointer-events-auto relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(28,78,64,0.24),_rgba(0,0,0,0.78)_55%)] shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),transparent_45%,rgba(34,211,238,0.08))]" />
                <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="absolute left-0 top-20 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative space-y-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                                <Sparkles size={12} />
                                {getRitualLabel(now.getHours())}
                            </div>
                            <div className="mt-4 flex items-end gap-3">
                                <div className="text-3xl font-light tracking-tight text-white">{formatClock(now)}</div>
                                <div className="pb-1 text-xs uppercase tracking-[0.22em] text-white/35">{formatDateLabel(now)}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Scope</div>
                            <div className="mt-1 text-sm text-white/78">{VIEW_LEVEL_LABELS[viewLevel] || 'Universe'}</div>
                            <div className="mt-1 text-[11px] text-emerald-200/70">{ORB_LABELS[orbState] || orbState}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                                <Compass size={12} />
                                Workspace
                            </div>
                            <div className="mt-2 truncate text-sm text-white/80">
                                {activeCompany?.name || user?.active_company_name || 'SAIMOR Universe'}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                                <Clock3 size={12} />
                                Presence
                            </div>
                            <div className="mt-2 text-sm text-white/80">
                                {user?.name ? `${user.name.split(' ')[0]} im Flow` : 'System bereit'}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                                    <Music2 size={12} />
                                    Atmosphere
                                </div>
                                <div className="mt-2 truncate text-sm text-white/82">
                                    {activeTrack?.name || 'Noch keine Library geladen'}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                                    <span>{ambientTracks.length} lokale Tracks</span>
                                    <span>•</span>
                                    <span>{Math.round(ambientAudio.volume * 100)}% volume</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAmbientToggle}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/22 bg-emerald-500/12 text-emerald-100 transition-colors hover:bg-emerald-500/20"
                                    aria-label={ambientAudio.enabled ? 'Musik pausieren' : 'Musik abspielen'}
                                >
                                    {ambientAudio.enabled ? <Pause size={15} /> : <Play size={15} />}
                                </button>
                                <button
                                    onClick={handleAmbientNext}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                                    aria-label="Nächsten Track wählen"
                                >
                                    <SkipForward size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex items-end gap-1">
                            {[14, 28, 20, 34, 18, 26].map((height, index) => (
                                <span
                                    key={`${height}-${index}`}
                                    className={`w-1.5 rounded-full bg-gradient-to-t from-emerald-400/35 to-cyan-300/75 ${ambientAudio.enabled ? 'animate-pulse' : 'opacity-30'}`}
                                    style={{
                                        height,
                                        animationDelay: `${index * 0.12}s`,
                                        animationDuration: `${1.1 + index * 0.08}s`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {quickActions.map((action) => (
                            <button
                                key={action.id}
                                onClick={action.onClick}
                                className="group rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition-all hover:border-emerald-400/25 hover:bg-emerald-500/10"
                            >
                                <action.icon size={16} className="text-white/60 transition-colors group-hover:text-emerald-200" />
                                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">{action.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { Check, User, Palette, Bell, Users, Activity, Info, FolderCog, Pencil, Trash2, Loader2, ChevronRight, Circle, Plus, Building2, Music, Upload, Play, Pause, Volume2 } from 'lucide-react';
import { CompanyLogoUpload } from '@/components/ui/CompanyLogo';
import { getCoreBaseUrl, updateCompany, updateDepartment, deleteDepartment, updateSpace, deleteSpace, createDepartment, createSpace } from '@/lib/api/coreClient';
import { toast } from '@/lib/toast';
import { isAdmin, roleLabel } from '@/lib/auth/roles';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useRuntimeSession } from '@/lib/auth/runtimeSession';
import {
    AMBIENT_AUDIO_STORAGE_KEYS,
    DEFAULT_AMBIENT_AUDIO_VOLUME,
    clampAmbientAudioVolume,
    formatAmbientTrackSize,
    listAmbientAudioTracks,
    persistAmbientSceneTrackMap,
    removeAmbientAudioTrack,
    resolveAmbientAudioSettings,
    resolveAmbientSceneTrackMap,
    storeAmbientAudioFiles,
    type AmbientSceneTrackMap,
    type AmbientAudioTrackMeta,
} from '@/lib/audio/ambientAudio';
import { RITUAL_SCENES, RITUAL_SCENE_ORDER } from '@/lib/os/ritualMode';
import type { AppProps } from '@/lib/apps/types';

const MAX_AMBIENT_AUDIO_TRACKS = 6;
const MAX_AMBIENT_AUDIO_FILE_BYTES = 25 * 1024 * 1024;

export default function SettingsApp({ paneId }: AppProps) {
    const id = paneId;
    const { data: session } = useRuntimeSession();
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const isActive = usePaneStore(s => s.activePaneId === paneId);
    const { activeCompanyId, isStandardMode, setIsStandardMode } = useNavStore();
    const { user, updateUserSettings } = useSessionStore();
    const { data: companies = [] } = useCompanies();
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: treeData = [] } = useTree(activeCompanyId);
    const queryClient = useQueryClient();
    const loadCompanies = () => queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
    const loadDepartments = (_companyId?: string | null) => queryClient.invalidateQueries({ queryKey: queryKeys.departments(activeCompanyId) });
    const loadTree = () => queryClient.invalidateQueries({ queryKey: queryKeys.tree(activeCompanyId) });
    const surfaceProfile = useSurfaceProfile();
    const pane = getPane(id);

    // Workspace Edit Mode State
    const [editingItem, setEditingItem] = useState<{ id: string; type: string; name: string } | null>(null);
    const [editName, setEditName] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [workspaceExpandedDept, setWorkspaceExpandedDept] = useState<string | null>(null);

    // Create Mode State
    const [isCreating, setIsCreating] = useState<'department' | 'space' | null>(null);
    const [createName, setCreateName] = useState('');
    const [createParentId, setCreateParentId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [activeTab, setActiveTab] = useState('profile');
    const [theme, setTheme] = useState('deep-space');
    const [language, setLanguage] = useState('en');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [interfaceScale, setInterfaceScale] = useState(1);
    const [ambientAudioEnabled, setAmbientAudioEnabled] = useState(false);
    const [ambientAudioVolume, setAmbientAudioVolume] = useState(DEFAULT_AMBIENT_AUDIO_VOLUME);
    const [ambientAudioTrackId, setAmbientAudioTrackId] = useState<string | null>(null);
    const [ambientSceneTrackMap, setAmbientSceneTrackMap] = useState<AmbientSceneTrackMap>({});
    const [ambientTracks, setAmbientTracks] = useState<AmbientAudioTrackMeta[]>([]);
    const [ambientTracksLoading, setAmbientTracksLoading] = useState(true);
    const [ambientTracksUploading, setAmbientTracksUploading] = useState(false);
    const ambientUploadInputRef = useRef<HTMLInputElement | null>(null);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const selectedAmbientTrack = useMemo(
        () => ambientTracks.find((track) => track.id === ambientAudioTrackId) ?? null,
        [ambientTracks, ambientAudioTrackId]
    );

    const [brandingName, setBrandingName] = useState('');
    const [brandingLogo, setBrandingLogo] = useState<string | null>(null);
    const [brandingSaving, setBrandingSaving] = useState(false);
    const userSettings = useMemo(() => (user?.settings ?? {}) as Record<string, unknown>, [user?.settings]);

        const activeCompany = useMemo(() => safeCompanies.find(c => c.id === activeCompanyId) || null, [safeCompanies, activeCompanyId]);

// Phase 6.3: Role-based Tab Visibility
    // Owner & Admin & Demo get full access
    const canManageTeam = isAdmin(user?.role) || user?.role === 'demo';
    const canViewSystem = isAdmin(user?.role) || user?.role === 'demo';
    const canEditWorkspace = isAdmin(user?.role) || user?.role === 'demo';

    // Defense-in-depth: do not allow cross-tenant writes (demo user can READ HQ, but must not WRITE HQ branding).
    const canWriteActiveCompany =
        !!activeCompany &&
        !!user &&
        !!(activeCompany as any).tenant_id &&
        !!(user as any).tenant_id &&
        (activeCompany as any).tenant_id === (user as any).tenant_id;

    const canEditBranding =
        canWriteActiveCompany &&
        isAdmin(user?.role);
    const structureTabLabel = surfaceProfile.isPublicDemoSurface ? 'Demo-Struktur' : 'Organisation';
    const showDemoReset = surfaceProfile.isPublicDemoSurface;

    const tabs = useMemo(() => [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'appearance', label: 'Design', icon: Palette },
        { id: 'audio', label: 'Audio', icon: Music },
        { id: 'notifications', label: 'Mitteilungen', icon: Bell },
        ...(canEditWorkspace ? [{ id: 'workspace', label: structureTabLabel, icon: FolderCog }] : []),
        ...(canManageTeam ? [{ id: 'team', label: 'Team & Benutzer', icon: Users }] : []),
        ...(canViewSystem ? [{ id: 'system', label: 'Systemstatus', icon: Activity }] : []),
        { id: 'about', label: 'Ueber Mora', icon: Info }
    ], [canEditWorkspace, canManageTeam, canViewSystem, structureTabLabel]);

    const resolvedTabs = useMemo(
        () => tabs.map((tab) => (tab.id === 'about' ? { ...tab, label: 'Ueber Mora' } : tab)),
        [tabs]
    );

    // Ensure active tab is valid for current role
    useEffect(() => {
        if (!resolvedTabs.find(t => t.id === activeTab)) {
            setActiveTab('profile');
        }
    }, [resolvedTabs, activeTab]);

    useEffect(() => {
        if (!activeCompany) return;
        setBrandingName(activeCompany.name || '');
        setBrandingLogo(activeCompany.logo_url || null);
    }, [activeCompany]);

useEffect(() => {
        if (user?.settings) {
            const themeValue = typeof userSettings.theme === 'string' ? userSettings.theme : 'deep-space';
            const languageValue = typeof userSettings.language === 'string' ? userSettings.language : 'en';
            const reducedMotionValue = typeof userSettings.reduced_motion === 'boolean' ? userSettings.reduced_motion : false;
            const scaleValue = typeof userSettings.scale === 'number' ? userSettings.scale : 1;

            setTheme(themeValue);
            setLanguage(languageValue);
            setReducedMotion(reducedMotionValue);
            setInterfaceScale(scaleValue);
            const ambientAudio = resolveAmbientAudioSettings(userSettings);
            setAmbientAudioEnabled(ambientAudio.enabled);
            setAmbientAudioVolume(ambientAudio.volume);
            setAmbientAudioTrackId(ambientAudio.trackId);
            setAmbientSceneTrackMap(resolveAmbientSceneTrackMap(userSettings));
            return;
        }
        if (typeof window !== 'undefined') {
            setTheme(localStorage.getItem('saimor_theme') || 'deep-space');
            setLanguage(localStorage.getItem('saimor_language') || 'en');
            setReducedMotion(localStorage.getItem('saimor_reduced_motion') === 'true');
            setInterfaceScale(parseFloat(localStorage.getItem('saimor_scale') || '1'));
            const ambientAudio = resolveAmbientAudioSettings();
            setAmbientAudioEnabled(ambientAudio.enabled);
            setAmbientAudioVolume(ambientAudio.volume);
            setAmbientAudioTrackId(ambientAudio.trackId);
            setAmbientSceneTrackMap(resolveAmbientSceneTrackMap());
        }
    }, [user?.settings, userSettings]);

    useEffect(() => {
        let isMounted = true;

        const loadAmbientTracks = async () => {
            try {
                const tracks = await listAmbientAudioTracks();
                if (!isMounted) return;
                setAmbientTracks(tracks);
            } catch (error) {
                console.error('[Settings] Failed to load ambient audio library:', error);
                if (isMounted) {
                    toast.error('Audio-Bibliothek konnte nicht geladen werden');
                }
            } finally {
                if (isMounted) {
                    setAmbientTracksLoading(false);
                }
            }
        };

        loadAmbientTracks();

        return () => {
            isMounted = false;
        };
    }, []);

    const saveSetting = (updates: Record<string, any>) => {
        try {
            updateUserSettings(updates);
            if (typeof window === 'undefined') return;

            // Safe localStorage writes
            try {
                if (updates.theme) localStorage.setItem('saimor_theme', updates.theme);
                if (updates.language) localStorage.setItem('saimor_language', updates.language);
                if (typeof updates.reduced_motion === 'boolean') {
                    localStorage.setItem('saimor_reduced_motion', String(updates.reduced_motion));
                }
                if (typeof updates.scale === 'number') {
                    localStorage.setItem('saimor_scale', String(updates.scale));
                }
                if (typeof updates.ambientAudioEnabled === 'boolean') {
                    localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEYS.enabled, String(updates.ambientAudioEnabled));
                    setAmbientAudioEnabled(updates.ambientAudioEnabled);
                }
                if (typeof updates.ambientAudioVolume === 'number') {
                    const clampedVolume = clampAmbientAudioVolume(updates.ambientAudioVolume);
                    localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEYS.volume, String(clampedVolume));
                    setAmbientAudioVolume(clampedVolume);
                }
                if (Object.prototype.hasOwnProperty.call(updates, 'ambientAudioTrackId')) {
                    const nextTrackId = typeof updates.ambientAudioTrackId === 'string' && updates.ambientAudioTrackId
                        ? updates.ambientAudioTrackId
                        : null;
                    if (nextTrackId) {
                        localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEYS.trackId, nextTrackId);
                    } else {
                        localStorage.removeItem(AMBIENT_AUDIO_STORAGE_KEYS.trackId);
                    }
                    setAmbientAudioTrackId(nextTrackId);
                }
            } catch (storageError) {
                console.warn('[Settings] localStorage unavailable:', storageError);
            }

            // Safe DOM manipulation
            if (typeof updates.scale === 'number') {
                try {
                    const clampedScale = Math.max(0.8, Math.min(1.2, updates.scale));
                    (document.body.style as any).zoom = clampedScale.toString();
                    document.documentElement.style.setProperty('--mora-interface-scale', clampedScale.toString());
                } catch (domError) {
                    console.warn('[Settings] DOM manipulation failed:', domError);
                }
            }
        } catch (error) {
            console.error('[Settings] Failed to save settings:', error);
            toast.error('Einstellungen konnten nicht gespeichert werden');
        }
    };

    const promptAmbientAudioUpload = () => {
        ambientUploadInputRef.current?.click();
    };

    const handleAmbientAudioToggle = () => {
        if (!ambientAudioTrackId) {
            const fallbackTrack = ambientTracks[0];
            if (!fallbackTrack) {
                toast.error('Lade zuerst mindestens einen Song hoch');
                return;
            }
            saveSetting({
                ambientAudioTrackId: fallbackTrack.id,
                ambientAudioEnabled: true,
            });
            toast.success(`"${fallbackTrack.name}" startet als Hintergrundsong`);
            return;
        }

        const nextEnabled = !ambientAudioEnabled;
        saveSetting({ ambientAudioEnabled: nextEnabled });
        toast.info(nextEnabled ? 'Hintergrundmusik aktiviert' : 'Hintergrundmusik pausiert');
    };

    const handleAmbientVolumeChange = (rawValue: number) => {
        const nextVolume = clampAmbientAudioVolume(rawValue);
        saveSetting({ ambientAudioVolume: nextVolume });
    };

    const handleAmbientTrackSelect = (trackId: string) => {
        saveSetting({ ambientAudioTrackId: trackId });
    };

    const handleAmbientSceneTrackSelect = (sceneId: keyof AmbientSceneTrackMap, trackId: string) => {
        const nextMap: AmbientSceneTrackMap = {
            ...ambientSceneTrackMap,
            [sceneId]: trackId || null,
        };
        setAmbientSceneTrackMap(nextMap);
        persistAmbientSceneTrackMap(nextMap);
    };

    const handleAmbientTrackDelete = async (trackId: string) => {
        try {
            await removeAmbientAudioTrack(trackId);
            const remainingTracks = ambientTracks.filter((track) => track.id !== trackId);
            setAmbientTracks(remainingTracks);

            if (ambientAudioTrackId === trackId) {
                const nextTrackId = remainingTracks[0]?.id ?? null;
                saveSetting({
                    ambientAudioTrackId: nextTrackId,
                    ambientAudioEnabled: nextTrackId ? ambientAudioEnabled : false,
                });
            }

            toast.info('Song aus der Bibliothek entfernt');
        } catch (error) {
            console.error('[Settings] Failed to remove ambient audio track:', error);
            toast.error('Song konnte nicht entfernt werden');
        }
    };

    const handleAmbientAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        event.target.value = '';

        if (selectedFiles.length === 0) return;

        const audioFiles = selectedFiles.filter((file) =>
            file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name)
        );

        if (audioFiles.length === 0) {
            toast.error('Bitte nur Audiodateien hochladen');
            return;
        }

        if (ambientTracks.length + audioFiles.length > MAX_AMBIENT_AUDIO_TRACKS) {
            toast.error(`Maximal ${MAX_AMBIENT_AUDIO_TRACKS} Songs gleichzeitig speichern`);
            return;
        }

        const oversizedFile = audioFiles.find((file) => file.size > MAX_AMBIENT_AUDIO_FILE_BYTES);
        if (oversizedFile) {
            toast.error(`"${oversizedFile.name}" ist groesser als 25 MB`);
            return;
        }

        setAmbientTracksUploading(true);

        try {
            const storedTracks = await storeAmbientAudioFiles(audioFiles);
            const nextTracks = await listAmbientAudioTracks();
            setAmbientTracks(nextTracks);

            if (!ambientAudioTrackId && storedTracks[0]) {
                saveSetting({ ambientAudioTrackId: storedTracks[0].id });
            }

            if (audioFiles.length !== selectedFiles.length) {
                toast.info('Nur Audiodateien wurden uebernommen');
            }

            toast.success(
                storedTracks.length === 1
                    ? `"${storedTracks[0].name}" wurde zur Audio-Bibliothek hinzugefuegt`
                    : `${storedTracks.length} Songs wurden zur Audio-Bibliothek hinzugefuegt`
            );
        } catch (error) {
            console.error('[Settings] Failed to store ambient audio files:', error);
            toast.error('Songs konnten nicht gespeichert werden');
        } finally {
            setAmbientTracksUploading(false);
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
            isActive={isActive}
            zIndex={pane.zIndex}
            paneId={id}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full">
                {/* Sidebar */}
                <div className="w-1/3 border-r border-white/10 p-4 space-y-1">
                    {resolvedTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${activeTab === tab.id
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
                                        onClick={() => {
                                            setTheme('deep-space');
                                            setIsStandardMode(false);
                                            saveSetting({ theme: 'deep-space' });
                                        }}
                                        className={`h-24 w-32 rounded-lg bg-black border relative overflow-hidden transition-all ${!isStandardMode
                                            ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                            : 'border-white/10 opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        <div className="absolute inset-0 bg-emerald-900/10" />
                                        {!isStandardMode && <Check className="absolute top-2 right-2 text-emerald-400" size={14} />}
                                        <div className="absolute bottom-2 left-2 text-xs text-emerald-400 font-medium">Immersive</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setTheme('standard');
                                            setIsStandardMode(true);
                                            saveSetting({ theme: 'standard' });
                                        }}
                                        className={`h-24 w-32 rounded border relative overflow-hidden transition-all ${isStandardMode
                                            ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                            : 'border-white/10 opacity-70 hover:opacity-100'
                                            }`}
                                        style={{ background: '#F3F3F3' }}
                                    >
                                        {isStandardMode && <Check className="absolute top-2 right-2 text-blue-600" size={14} />}
                                        {/* Office-like preview: white panel with gray sidebar */}
                                        <div className="absolute inset-1 flex gap-0.5">
                                            <div className="w-3 bg-[#E1E1E1] rounded-sm" />
                                            <div className="flex-1 bg-white rounded-sm flex flex-col p-1 gap-0.5">
                                                <div className="h-1.5 bg-[#0078D4] rounded-sm w-1/2" />
                                                <div className="h-1 bg-gray-200 rounded-sm w-full" />
                                                <div className="h-1 bg-gray-200 rounded-sm w-3/4" />
                                                <div className="h-1 bg-gray-200 rounded-sm w-5/6" />
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 text-xs text-[#0078D4] font-medium">Standard</div>
                                    </button>
                                </div>
                            </div>

                            {canEditBranding && activeCompany && (
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="text-xs uppercase tracking-wider text-white/40">Branding</div>
                                    <div className="flex flex-col gap-4">
                                        <CompanyLogoUpload
                                            value={brandingLogo || undefined}
                                            onChange={(url) => setBrandingLogo(url)}
                                            companyName={brandingName || activeCompany.name}
                                            companyId={activeCompanyId}
                                        />
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase tracking-wider text-white/40">Unternehmensname</label>
                                            <input
                                                value={brandingName}
                                                onChange={(e) => setBrandingName(e.target.value)}
                                                placeholder={activeCompany.name}
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                            />
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={async () => {
                                                        if (!activeCompanyId) return;
                                                        const nextName = brandingName?.trim() || activeCompany.name;
                                                        const normalized = nextName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                                        setBrandingSaving(true);
                                                        try {
                                                            const payload: any = {
                                                                name: nextName,
                                                                logo_url: brandingLogo
                                                            };
                                                            await updateCompany(activeCompanyId, payload);
                                                            await loadCompanies();
                                                            toast.success('Branding aktualisiert');
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error('Branding-Update fehlgeschlagen');
                                                        } finally {
                                                            setBrandingSaving(false);
                                                        }
                                                    }}
                                                    disabled={brandingSaving}
                                                    className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                                >
                                                    {brandingSaving ? <Loader2 className="animate-spin" size={14} /> : 'Save Branding'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBrandingName(activeCompany.name || '');
                                                        setBrandingLogo(activeCompany.logo_url || null);
                                                    }}
                                                    className="px-3 py-2 text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

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

                    {activeTab === 'audio' && (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg text-white font-light">Hintergrundmusik</h3>
                                    <p className="mt-2 text-sm text-white/45 max-w-xl">
                                        Lege dir eine kleine lokale Song-Auswahl an. Die Musik laeuft weiter,
                                        solange SAIMOR OS geöffnet ist, auch wenn du in andere Panes wechselst.
                                    </p>
                                </div>

                                <button
                                    onClick={handleAmbientAudioToggle}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${ambientAudioEnabled
                                        ? 'bg-emerald-500/18 border-emerald-500/40 text-emerald-300'
                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {ambientAudioEnabled ? <Pause size={15} /> : <Play size={15} />}
                                    {ambientAudioEnabled ? 'Pausieren' : 'Abspielen'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="text-sm text-white/80 font-medium">Aktiver Song</div>
                                            <div className="text-xs text-white/40 mt-1">
                                                {selectedAmbientTrack
                                                    ? `${selectedAmbientTrack.name} - ${formatAmbientTrackSize(selectedAmbientTrack.size)}`
                                                    : 'Noch kein Song ausgewaehlt'}
                                            </div>
                                        </div>
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/45">
                                            Loop
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/40">
                                            <span className="inline-flex items-center gap-2">
                                                <Volume2 size={14} />
                                                Lautstaerke
                                            </span>
                                            <span>{Math.round(ambientAudioVolume * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={Math.round(ambientAudioVolume * 100)}
                                            onChange={(event) => handleAmbientVolumeChange(Number(event.target.value) / 100)}
                                            className="w-full accent-emerald-400"
                                        />
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/45 leading-relaxed">
                                        Songs bleiben lokal in diesem Browser gespeichert. Kein Upload zum Server.
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4">
                                        <div className="text-sm text-white/80 font-medium">Szenen & Musik</div>
                                        <div className="mt-1 text-xs text-white/40 leading-relaxed">
                                            Optional kannst du pro Szene einen bevorzugten Song hinterlegen. Wenn die Szene aktiv ist,
                                            nutzt SAIMOR zuerst diesen Track und passt die Lautstaerke leicht an.
                                        </div>

                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            {RITUAL_SCENE_ORDER.map((sceneId) => (
                                                <label
                                                    key={sceneId}
                                                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                                                >
                                                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                                                        {RITUAL_SCENES[sceneId].label}
                                                    </div>
                                                    <div className="mt-1 text-xs text-white/45">
                                                        {RITUAL_SCENES[sceneId].description}
                                                    </div>
                                                    <select
                                                        value={ambientSceneTrackMap[sceneId] ?? ''}
                                                        onChange={(event) => handleAmbientSceneTrackSelect(sceneId, event.target.value)}
                                                        className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-emerald-500/40 focus:outline-none"
                                                    >
                                                        <option value="">Aktiven Song beibehalten</option>
                                                        {ambientTracks.map((track) => (
                                                            <option key={track.id} value={track.id}>
                                                                {track.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-white/80 font-medium">Bibliothek</div>
                                            <div className="text-xs text-white/40 mt-1">
                                                Bis zu {MAX_AMBIENT_AUDIO_TRACKS} lokale Songs
                                            </div>
                                        </div>
                                        <button
                                            onClick={promptAmbientAudioUpload}
                                            disabled={ambientTracksUploading || ambientTracks.length >= MAX_AMBIENT_AUDIO_TRACKS}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/12 border border-cyan-400/25 text-cyan-200 text-sm transition-all hover:bg-cyan-500/18 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {ambientTracksUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                            Song hochladen
                                        </button>
                                    </div>

                                    <input
                                        ref={ambientUploadInputRef}
                                        type="file"
                                        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
                                        multiple
                                        onChange={handleAmbientAudioUpload}
                                        className="hidden"
                                    />

                                    {ambientTracksLoading ? (
                                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/50">
                                            <Loader2 size={16} className="animate-spin" />
                                            Audio-Bibliothek wird geladen...
                                        </div>
                                    ) : ambientTracks.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center">
                                            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                                <Music size={18} className="text-white/55" />
                                            </div>
                                            <div className="text-sm text-white/75">Noch keine Songs in deiner Library</div>
                                            <div className="mt-1 text-xs text-white/40">
                                                Lade MP3, WAV, M4A, OGG, AAC oder FLAC hoch.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {ambientTracks.map((track) => {
                                                const isSelected = track.id === ambientAudioTrackId;

                                                return (
                                                    <div
                                                        key={track.id}
                                                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all ${isSelected
                                                            ? 'border-emerald-500/35 bg-emerald-500/12'
                                                            : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]'
                                                            }`}
                                                    >
                                                        <button
                                                            onClick={() => handleAmbientTrackSelect(track.id)}
                                                            className="min-w-0 flex-1 text-left"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-sm font-medium ${isSelected ? 'text-emerald-200' : 'text-white/80'}`}>
                                                                    {track.name}
                                                                </span>
                                                                {isSelected && (
                                                                    <span className="rounded-full bg-emerald-500/18 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                                                                        aktiv
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 text-xs text-white/40">
                                                                {formatAmbientTrackSize(track.size)}
                                                            </div>
                                                        </button>

                                                        <div className="flex items-center gap-2">
                                                            {isSelected && ambientAudioEnabled ? (
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/12 text-emerald-200">
                                                                    <Pause size={14} />
                                                                </div>
                                                            ) : (
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
                                                                    <Play size={14} />
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleAmbientTrackDelete(track.id);
                                                                }}
                                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-300"
                                                                aria-label={`${track.name} entfernen`}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Mitteilungen & MORA</h3>

                            {/* MORA Intelligence Section */}
                            <div className="space-y-4">
                                <h4 className="text-xs uppercase tracking-wider text-white/40">MORA Intelligence</h4>

                                {/* Auto-Execute Toggle */}
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="text-sm text-white/80 font-medium">Aktionen direkt ausfuehren</div>
                                            <div className="text-xs text-white/40 mt-1">
                                                Wenn deaktiviert, fragt MORA vor jedem Werkzeugschritt nach deiner Bestätigung.
                                                Das betrifft zum Beispiel Dateierstellung und inhaltliche Änderungen.
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const current = user?.settings?.autoExecuteActions ?? true;
                                                const next = !current;
                                                saveSetting({ autoExecuteActions: next });
                                                toast.info(next
                                                    ? 'MORA wird Aktionen automatisch ausfuehren'
                                                    : 'MORA wird vor Aktionen fragen');
                                            }}
                                            className={`w-12 h-7 rounded-full border relative transition-all flex-shrink-0 ml-4 ${(user?.settings?.autoExecuteActions ?? true)
                                                ? 'bg-emerald-500/30 border-emerald-500/50'
                                                : 'bg-white/10 border-white/20'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all ${(user?.settings?.autoExecuteActions ?? true)
                                                ? 'left-6 bg-emerald-400'
                                                : 'left-1 bg-white/40'
                                                }`} />
                                        </button>
                                    </div>

                                    {/* Status Indicator */}
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${(user?.settings?.autoExecuteActions ?? true)
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                        {(user?.settings?.autoExecuteActions ?? true) ? (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                <span>MORA führt Aktionen automatisch aus</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                <span>Datenhoheit aktiv: Bestätigung vor jeder Aktion</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Notification Settings */}
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-white/80">Desktop-Benachrichtigungen</div>
                                            <div className="text-xs text-white/40">Browser-Benachrichtigungen aktivieren</div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const current = user?.settings?.desktopNotifications ?? false;
                                                if (!current) {
                                                    // Request permission
                                                    if (typeof Notification !== 'undefined') {
                                                        const perm = await Notification.requestPermission();
                                                        if (perm === 'granted') {
                                                            saveSetting({ desktopNotifications: true });
                                                            toast.success('Desktop-Benachrichtigungen aktiviert');
                                                        } else {
                                                            toast.error('Berechtigung verweigert');
                                                        }
                                                    }
                                                } else {
                                                    saveSetting({ desktopNotifications: false });
                                                    toast.info('Desktop-Benachrichtigungen deaktiviert');
                                                }
                                            }}
                                            className={`w-10 h-6 rounded-full border relative transition-all ${(user?.settings?.desktopNotifications)
                                                ? 'bg-emerald-500/30 border-emerald-500/50'
                                                : 'bg-white/10 border-white/10'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${(user?.settings?.desktopNotifications)
                                                ? 'left-5 bg-emerald-400'
                                                : 'left-0.5 bg-white/40'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-white/80">Sound Effects</div>
                                            <div className="text-xs text-white/40">UI-Sounds fuer Aktionen</div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const current = user?.settings?.soundEffects ?? false;
                                                saveSetting({ soundEffects: !current });
                                                toast.info(!current ? 'Sounds aktiviert' : 'Sounds deaktiviert');
                                            }}
                                            className={`w-10 h-6 rounded-full border relative transition-all ${(user?.settings?.soundEffects)
                                                ? 'bg-emerald-500/30 border-emerald-500/50'
                                                : 'bg-white/10 border-white/10'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${(user?.settings?.soundEffects)
                                                ? 'left-5 bg-emerald-400'
                                                : 'left-0.5 bg-white/40'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'workspace' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg text-white font-light">{surfaceProfile.isPublicDemoSurface ? 'Demo-Struktur pflegen' : 'Organisation verwalten'}</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setIsCreating('department');
                                            setCreateName('');
                                            setCreateParentId(null);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs transition-colors"
                                    >
                                        <Plus size={14} />
                                        Department
                                    </button>
                                    <span className="text-xs text-white/30 px-2 py-1 bg-white/5 rounded">
                                        {roleLabel(user?.role)}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-white/40">
                                Bearbeite Departments, Spaces und Ordner. Aendere Namen, Farben und Icons.
                            </p>

                            {/* Create Department Form */}
                            {isCreating === 'department' && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                                    <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                                        <Plus size={16} />
                                        Neues Department erstellen
                                    </div>
                                    <input
                                        type="text"
                                        value={createName}
                                        onChange={(e) => setCreateName(e.target.value)}
                                        placeholder="Department Name..."
                                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                                        autoFocus
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Escape') {
                                                setIsCreating(null);
                                                setCreateName('');
                                            }
                                            if (e.key === 'Enter' && createName.trim() && activeCompanyId) {
                                                setIsSubmitting(true);
                                                try {
                                                    await createDepartment({
                                                        name: createName.trim(),
                                                        company_id: activeCompanyId
                                                    });
                                                    await loadDepartments(activeCompanyId);
                                                    await loadTree();
                                                    toast.success('Department erstellt');
                                                    setIsCreating(null);
                                                    setCreateName('');
                                                } catch (err) {
                                                    toast.error('Erstellen fehlgeschlagen');
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!createName.trim() || !activeCompanyId) return;
                                                setIsSubmitting(true);
                                                try {
                                                    await createDepartment({
                                                        name: createName.trim(),
                                                        company_id: activeCompanyId
                                                    });
                                                    await loadDepartments(activeCompanyId);
                                                    await loadTree();
                                                    toast.success('Department erstellt');
                                                    setIsCreating(null);
                                                    setCreateName('');
                                                } catch (err) {
                                                    toast.error('Erstellen fehlgeschlagen');
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }}
                                            disabled={!createName.trim() || isSubmitting}
                                            className="px-4 py-2 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 text-sm disabled:opacity-50 transition-colors"
                                        >
                                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Erstellen'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsCreating(null);
                                                setCreateName('');
                                            }}
                                            className="px-3 py-2 text-xs text-white/40 hover:text-white/70"
                                        >
                                            Abbrechen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Department List from Tree Data */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {treeData && treeData.length > 0 ? (
                                    treeData
                                        .filter((node: any) => node.type === 'department')
                                        .map((dept: any) => (
                                            <div key={dept.id} className="border border-white/10 rounded-lg overflow-hidden">
                                                {/* Department Header */}
                                                <div
                                                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
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
                                                                onBlur={async () => {
                                                                    if (editName.trim() && editName !== editingItem?.name) {
                                                                        try {
                                                                            await updateDepartment(editingItem!.id, { name: editName.trim() });
                                                                            await loadDepartments(activeCompanyId || undefined);
                                                                            if (activeCompanyId) loadTree();
                                                                            toast.success('Department umbenannt');
                                                                        } catch (err) {
                                                                            toast.error('Umbenennen fehlgeschlagen');
                                                                        }
                                                                    }
                                                                    setEditingItem(null);
                                                                }}
                                                                onKeyDown={async (e) => {
                                                                    if (e.key === 'Enter' && editName.trim() && editName !== editingItem?.name) {
                                                                        try {
                                                                            await updateDepartment(editingItem!.id, { name: editName.trim() });
                                                                            await loadDepartments(activeCompanyId || undefined);
                                                                            if (activeCompanyId) loadTree();
                                                                            toast.success('Department umbenannt');
                                                                        } catch (err) {
                                                                            toast.error('Umbenennen fehlgeschlagen');
                                                                        }
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
                                                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors duration-200"
                                                            title="Umbenennen"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!confirm(`"${dept.name}" wirklich loeschen? Alle enthaltenen Spaces und Dokumente werden gelöscht.`)) return;
                                                                setIsDeleting(dept.id);
                                                                try {
                                                                    await deleteDepartment(dept.id);
                                                                    await loadDepartments(activeCompanyId || undefined);
                                                                    if (activeCompanyId) loadTree();
                                                                    toast.success('Department gelöscht');
                                                                } catch (err) {
                                                                    toast.error('Loeschen fehlgeschlagen');
                                                                } finally {
                                                                    setIsDeleting(null);
                                                                }
                                                            }}
                                                            disabled={isDeleting === dept.id}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors duration-200 disabled:opacity-30"
                                                            title="Loeschen"
                                                        >
                                                            {isDeleting === dept.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded: Show Spaces/Folders */}
                                                {workspaceExpandedDept === dept.id && (
                                                    <div className="border-t border-white/5 bg-black/20">
                                                        {/* Add Space Button */}
                                                        <div className="px-4 py-2 pl-10 border-b border-white/5">
                                                            {isCreating === 'space' && createParentId === dept.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={createName}
                                                                        onChange={(e) => setCreateName(e.target.value)}
                                                                        placeholder="Space Name..."
                                                                        className="flex-1 px-2 py-1 rounded bg-black/30 border border-blue-500/30 text-xs text-white placeholder-white/30 focus:outline-none"
                                                                        autoFocus
                                                                        onKeyDown={async (e) => {
                                                                            if (e.key === 'Escape') {
                                                                                setIsCreating(null);
                                                                                setCreateName('');
                                                                                setCreateParentId(null);
                                                                            }
                                                                            if (e.key === 'Enter' && createName.trim()) {
                                                                                setIsSubmitting(true);
                                                                                try {
                                                                                    await createSpace({
                                                                                        name: createName.trim(),
                                                                                        department_id: dept.id
                                                                                    });
                                                                                    if (activeCompanyId) await loadTree();
                                                                                    toast.success('Space erstellt');
                                                                                    setIsCreating(null);
                                                                                    setCreateName('');
                                                                                    setCreateParentId(null);
                                                                                } catch (err) {
                                                                                    toast.error('Erstellen fehlgeschlagen');
                                                                                } finally {
                                                                                    setIsSubmitting(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!createName.trim()) return;
                                                                            setIsSubmitting(true);
                                                                            try {
                                                                                await createSpace({
                                                                                    name: createName.trim(),
                                                                                    department_id: dept.id
                                                                                });
                                                                                if (activeCompanyId) await loadTree();
                                                                                toast.success('Space erstellt');
                                                                                setIsCreating(null);
                                                                                setCreateName('');
                                                                                setCreateParentId(null);
                                                                            } catch (err) {
                                                                                toast.error('Erstellen fehlgeschlagen');
                                                                            } finally {
                                                                                setIsSubmitting(false);
                                                                            }
                                                                        }}
                                                                        disabled={isSubmitting}
                                                                        className="p-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50"
                                                                    >
                                                                        {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        setIsCreating('space');
                                                                        setCreateParentId(dept.id);
                                                                        setCreateName('');
                                                                    }}
                                                                    className="flex items-center gap-1.5 text-[10px] text-blue-400/60 hover:text-blue-300 transition-colors"
                                                                >
                                                                    <Plus size={10} />
                                                                    Space hinzufuegen
                                                                </button>
                                                            )}
                                                        </div>
                                                        {dept.children?.map((child: any) => (
                                                            <div
                                                                key={child.id}
                                                                className="flex items-center justify-between px-4 py-2 pl-10 hover:bg-white/5 transition-colors duration-200"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Circle size={8} className="text-blue-400" fill="currentColor" />
                                                                    {editingItem?.id === child.id ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editName}
                                                                            onChange={(e) => setEditName(e.target.value)}
                                                                            onBlur={async () => {
                                                                                if (editName.trim() && editName !== editingItem?.name) {
                                                                                    try {
                                                                                        if (editingItem?.type === 'space') {
                                                                                            await updateSpace(editingItem.id, { name: editName.trim() });
                                                                                        } else {
                                                                                            await updateDepartment(editingItem!.id, { name: editName.trim() });
                                                                                        }
                                                                                        if (activeCompanyId) loadTree();
                                                                                        toast.success('Umbenannt');
                                                                                    } catch (err) {
                                                                                        toast.error('Umbenennen fehlgeschlagen');
                                                                                    }
                                                                                }
                                                                                setEditingItem(null);
                                                                            }}
                                                                            onKeyDown={async (e) => {
                                                                                if (e.key === 'Enter' && editName.trim() && editName !== editingItem?.name) {
                                                                                    try {
                                                                                        if (editingItem?.type === 'space') {
                                                                                            await updateSpace(editingItem.id, { name: editName.trim() });
                                                                                        } else {
                                                                                            await updateDepartment(editingItem!.id, { name: editName.trim() });
                                                                                        }
                                                                                        if (activeCompanyId) loadTree();
                                                                                        toast.success('Umbenannt');
                                                                                    } catch (err) {
                                                                                        toast.error('Umbenennen fehlgeschlagen');
                                                                                    }
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
                                                                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors duration-200"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm(`"${child.name}" wirklich loeschen?`)) return;
                                                                            setIsDeleting(child.id);
                                                                            try {
                                                                                if (child.type === 'space') {
                                                                                    await deleteSpace(child.id);
                                                                                } else {
                                                                                    await deleteDepartment(child.id);
                                                                                }
                                                                                if (activeCompanyId) loadTree();
                                                                                toast.success('Geloescht');
                                                                            } catch (err) {
                                                                                toast.error('Loeschen fehlgeschlagen');
                                                                            } finally {
                                                                                setIsDeleting(null);
                                                                            }
                                                                        }}
                                                                        disabled={isDeleting === child.id}
                                                                        className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors duration-200 disabled:opacity-30"
                                                                    >
                                                                        {isDeleting === child.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
                                        <p className="text-white/40 text-sm">{surfaceProfile.isPublicDemoSurface ? 'Lade Demo-Struktur...' : 'Lade Organisationsstruktur...'}</p>
                                        <button
                                            onClick={() => activeCompanyId && loadTree()}
                                            className="mt-4 px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg text-white/60 transition-colors duration-200"
                                        >
                                            Neu laden
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Future: Color & Icon Picker */}
                            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                                <h4 className="text-sm text-white/60 font-medium mb-2">Zukuenftige Features</h4>
                                <ul className="text-xs text-white/40 space-y-1">
                                    <li>- Farben fuer Departments anpassen</li>
                                    <li>- Custom Icons zuweisen</li>
                                    <li>- Drag & Drop Sortierung</li>
                                    <li>- Team Manager: Sichtbarkeit pro Rolle</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Team Management</h3>
                            <div className="p-8 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <Users className="text-emerald-300" size={24} />
                                </div>
                                <h4 className="text-white/80 font-medium">Team & Benutzer</h4>
                                <p className="text-white/40 text-xs mt-2 max-w-xs">
                                    Verwalte dein Team, weise Rollen zu und steuere Berechtigungen.
                                </p>
                                <button
                                    onClick={() => {
                                        const { openPane } = usePaneStore.getState();
                                        openPane({
                                            id: "team-main",
                                            type: "team",
                                            title: "Team",
                                            size: { width: 840, height: 640 },
                                        });
                                    }}
                                    className="mt-4 px-5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm hover:bg-emerald-500/25 transition-colors duration-200 flex items-center gap-2"
                                >
                                    <Users size={14} />
                                    Team Manager öffnen
                                    <ChevronRight size={14} />
                                </button>
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
                                    <div className="text-white font-mono text-sm">v2.0.0-beta</div>
                                </div>
                                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                    <div className="text-xs text-violet-400 uppercase tracking-wider mb-1">Abteilungen</div>
                                    <div className="text-white font-mono text-sm">{departments.length}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">
                                        {surfaceProfile.isPublicDemoSurface ? 'Instanz' : 'Organisationen'}
                                    </div>
                                    <div className="text-white font-mono text-sm">
                                        {surfaceProfile.isPublicDemoSurface ? 'Demo' : companies.length}
                                    </div>
                                </div>
                            </div>

                            {/* DEMO / RESET ACTIONS */}
                            {showDemoReset && (
                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <h4 className="text-sm font-medium text-white/80">Datenverwaltung</h4>
                                <p className="hidden text-xs text-white/40">
                                    Hier kannst du die komplette Demo-Struktur zurücksetzen. Alle Daten werden gelöscht und mit den Standard-Demo-Daten ueberschrieben.
                                </p>
                                <p className="text-xs text-white/40">
                                    Hier kannst du die öffentliche Demo-Instanz auf den kuratierten Ausgangszustand zurücksetzen.
                                </p>

                                <button
                                    onClick={async () => {
                                        if (!confirm('Bist du sicher? Alle Änderungen gehen verloren und die Demo-Instanz wird auf den kuratierten Ausgangszustand zurückgesetzt.')) return;

                                        try {
                                            toast.loading('Demo-Instanz wird zurückgesetzt...');

                                            // Get token from Session (Production Auth)
                                            const token = session?.user?.accessToken; // || localStorage fallback removed
                                            const userId = session?.user?.id || user?.id || 'demo_user';

                                            // Call correct endpoint from demo.py: /reset-instance
                                            const headers: Record<string, string> = {
                                                'Content-Type': 'application/json',
                                                'X-Tenant-ID': 'demo' // Force demo context for reset
                                            };
                                            if (token) headers['Authorization'] = `Bearer ${token}`;
                                            headers['X-User-ID'] = userId;

                                            const res = await fetch(`${getCoreBaseUrl()}/v1/demo/reset-instance`, {
                                                method: 'POST',
                                                headers
                                            });

                                            if (!res.ok) {
                                                const err = await res.json().catch(() => ({}));
                                                console.error('[Reset Error]', err);
                                                throw new Error(err.detail || 'Reset failed');
                                            }

                                            toast.success('Demo-Instanz erfolgreich zurückgesetzt!');
                                            // Force reload window to clear all local state nuances
                                            window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            toast.error('Fehler beim Zuruecksetzen.');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-red-400 transition-all group [&>span:last-child]:hidden"
                                >
                                    <Trash2 size={16} className="group-hover:animate-pulse" />
                                    <span className="hidden">Demo-Instanz zurücksetzen</span>
                                    <span>Demo-Daten zurücksetzen</span>
                                    <span>Demo-Instanz zurücksetzen</span>
                                </button>
                            </div>
                            )}

                            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/60">Database Status</span>
                                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Connected
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/60">Core API</span>
                                    <span className="text-xs text-white/50 font-mono">{getCoreBaseUrl()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Ueber SAIMOR</h3>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-white/60 leading-relaxed">
                                <p className="mb-4">
                                    SAIMOR ist das semantische Betriebssystem fuer Klarheit, Struktur und belastbare Erinnerung in Organisationen.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-white/30 mt-8">
                                    <span>v2.0.0-beta</span>
                                    <span>-</span>
                                    <span>Mora Core + Gateway</span>
                                    <span>-</span>
                                    <span>{process.env.NODE_ENV}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
}



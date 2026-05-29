'use client';

export type RitualSceneId = 'flow' | 'build' | 'lounge' | 'night';

export interface RitualSettings {
    sceneId: RitualSceneId;
    autoTime: boolean;
}

export interface RitualSettingsUpdate {
    ritualSceneId?: RitualSceneId;
    ritualAutoTime?: boolean;
}

export interface RitualSceneDefinition {
    id: RitualSceneId;
    label: string;
    shortLabel: string;
    description: string;
    accent: string;      // rgba — soft gradients / auras
    accentHex: string;   // solid hex — consumers needing hex (orb, canvas)
    aura: string;
    audioGain: number;
}

export const DEFAULT_RITUAL_SCENE: RitualSceneId = 'flow';

export const RITUAL_SCENE_ORDER: RitualSceneId[] = ['flow', 'build', 'lounge', 'night'];

export const RITUAL_STORAGE_KEYS = {
    sceneId: 'saimor_ritual_scene_id',
    autoTime: 'saimor_ritual_auto_time',
} as const;

export const RITUAL_MODE_UPDATED_EVENT = 'saimor-ritual-mode-updated';

export const RITUAL_SCENES: Record<RitualSceneId, RitualSceneDefinition> = {
    flow: {
        id: 'flow',
        label: 'Flow',
        shortLabel: 'Flow',
        description: 'Ruhig und offen für Schreiben, Lesen und entspannte Navigation.',
        accent: 'rgba(16,185,129,0.34)',
        accentHex: '#10B981',
        aura: 'rgba(34,211,238,0.22)',
        audioGain: 0.92,
    },
    build: {
        id: 'build',
        label: 'Build',
        shortLabel: 'Build',
        description: 'Klarer Kontrast für Umsetzung, Struktur und schnelle Entscheidungen.',
        accent: 'rgba(56,189,248,0.40)',
        accentHex: '#38BDF8',
        aura: 'rgba(251,191,36,0.22)',
        audioGain: 1.05,
    },
    lounge: {
        id: 'lounge',
        label: 'Lounge',
        shortLabel: 'Lounge',
        description: 'Wärmer und weicher für Review, Lesen und ruhigere Sessions.',
        accent: 'rgba(251,146,60,0.32)',
        accentHex: '#FB923C',
        aura: 'rgba(244,114,182,0.18)',
        audioGain: 0.86,
    },
    night: {
        id: 'night',
        label: 'Nacht',
        shortLabel: 'Nacht',
        description: 'Dunkler und stiller für späte, lange Arbeitsphasen.',
        accent: 'rgba(99,102,241,0.34)',
        accentHex: '#6366F1',
        aura: 'rgba(34,211,238,0.18)',
        audioGain: 0.76,
    },
};

const isValidRitualScene = (value: unknown): value is RitualSceneId => (
    typeof value === 'string' && RITUAL_SCENE_ORDER.includes(value as RitualSceneId)
);

const readStoredBoolean = (key: string, fallback: boolean) => {
    if (typeof window === 'undefined') return fallback;
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return fallback;
    return rawValue === '1' || rawValue === 'true';
};

const readStoredSceneId = () => {
    if (typeof window === 'undefined') return DEFAULT_RITUAL_SCENE;
    const rawValue = window.localStorage.getItem(RITUAL_STORAGE_KEYS.sceneId);
    return isValidRitualScene(rawValue) ? rawValue : DEFAULT_RITUAL_SCENE;
};

export const getAutoRitualScene = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) return 'flow';
    if (hour >= 11 && hour < 17) return 'build';
    if (hour >= 17 && hour < 22) return 'lounge';
    return 'night';
};

export const resolveRitualSettings = (userSettings?: Record<string, any> | null): RitualSettings => ({
    sceneId: isValidRitualScene(userSettings?.ritualSceneId)
        ? userSettings.ritualSceneId
        : readStoredSceneId(),
    autoTime: typeof userSettings?.ritualAutoTime === 'boolean'
        ? userSettings.ritualAutoTime
        : readStoredBoolean(RITUAL_STORAGE_KEYS.autoTime, true),
});

export const getEffectiveRitualScene = (settings: RitualSettings, now: Date = new Date()) => (
    settings.autoTime ? getAutoRitualScene(now) : settings.sceneId
);

export const cycleRitualScene = (currentSceneId: RitualSceneId) => {
    const currentIndex = RITUAL_SCENE_ORDER.indexOf(currentSceneId);
    return RITUAL_SCENE_ORDER[(currentIndex + 1 + RITUAL_SCENE_ORDER.length) % RITUAL_SCENE_ORDER.length];
};

export const persistRitualSettings = (
    updateUserSettings: ((settings: Record<string, any>) => void) | null | undefined,
    updates: RitualSettingsUpdate
) => {
    updateUserSettings?.(updates);

    if (typeof window === 'undefined') return;

    if (isValidRitualScene(updates.ritualSceneId)) {
        window.localStorage.setItem(RITUAL_STORAGE_KEYS.sceneId, updates.ritualSceneId);
    }

    if (typeof updates.ritualAutoTime === 'boolean') {
        window.localStorage.setItem(RITUAL_STORAGE_KEYS.autoTime, String(updates.ritualAutoTime));
    }

    window.dispatchEvent(new CustomEvent(RITUAL_MODE_UPDATED_EVENT));
};

'use client';

import type { RitualSceneId } from '@/lib/os/ritualMode';
import { queueAccountSettingsSync } from '@/lib/userSettings/persistAccountSettings';

export type AmbientAudioTrackSource = 'local' | 'remote';

export interface AmbientAudioTrackMeta {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    source?: AmbientAudioTrackSource;
    url?: string;
    sceneIds?: RitualSceneId[];
}

interface AmbientAudioTrackRecord extends AmbientAudioTrackMeta {
    blob: Blob;
}

interface AmbientAudioCatalogTrack {
    id: string;
    name: string;
    url: string;
    type?: string;
    size?: number;
    uploadedAt?: string;
    sceneIds?: RitualSceneId[];
}

export interface AmbientRadioChannel {
    id: RitualSceneId;
    label: string;
    timeRange: string;
    description?: string;
    trackIds?: string[];
}

interface AmbientAudioCatalog {
    version?: number;
    channels?: AmbientRadioChannel[];
    tracks?: AmbientAudioCatalogTrack[];
}

export interface AmbientAudioSettings {
    enabled: boolean;
    volume: number;
    trackId: string | null;
}

export type AmbientSceneTrackMap = Partial<Record<RitualSceneId, string | null>>;

export interface AmbientAudioSettingsUpdate {
    ambientAudioEnabled?: boolean;
    ambientAudioVolume?: number;
    ambientAudioTrackId?: string | null;
}

export const DEFAULT_AMBIENT_AUDIO_VOLUME = 0.14;

export const AMBIENT_AUDIO_STORAGE_KEYS = {
    enabled: 'saimor_ambient_audio_enabled',
    volume: 'saimor_ambient_audio_volume',
    trackId: 'saimor_ambient_audio_track_id',
    sceneTrackMap: 'saimor_ambient_audio_scene_track_map',
} as const;

export const AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT = 'saimor-ambient-audio-library-updated';
export const AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT = 'saimor-ambient-audio-settings-updated';
export const AMBIENT_AUDIO_CATALOG_URL = '/ambient/catalog.json';

const DB_NAME = 'saimor-ambient-audio';
const STORE_NAME = 'tracks';
const RITUAL_SCENE_IDS: RitualSceneId[] = ['flow', 'build', 'lounge', 'night'];

let ambientAudioDbPromise: Promise<IDBDatabase> | null = null;
let remoteCatalogPromise: Promise<AmbientAudioCatalog> | null = null;

const supportsIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window;

const readStoredBoolean = (key: string, fallback: boolean) => {
    if (typeof window === 'undefined') return fallback;
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return fallback;
    return rawValue === '1' || rawValue === 'true';
};

const readStoredTrackId = (key: string) => {
    if (typeof window === 'undefined') return null;
    const rawValue = window.localStorage.getItem(key);
    return rawValue && rawValue.trim().length > 0 ? rawValue : null;
};

const sanitizeSceneTrackMap = (value: unknown): AmbientSceneTrackMap => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    const parsed = value as Record<string, unknown>;
    const result: AmbientSceneTrackMap = {};
    for (const sceneId of RITUAL_SCENE_IDS) {
        const candidate = parsed[sceneId];
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            result[sceneId] = candidate;
        } else if (candidate === null) {
            result[sceneId] = null;
        }
    }
    return result;
};

const readStoredSceneTrackMap = (): AmbientSceneTrackMap => {
    if (typeof window === 'undefined') return {};
    const rawValue = window.localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEYS.sceneTrackMap);
    if (!rawValue) return {};

    try {
        return sanitizeSceneTrackMap(JSON.parse(rawValue));
    } catch {
        return {};
    }
};

const emitAmbientAudioSettingsUpdated = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT));
    }
};

export const clampAmbientAudioVolume = (value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_AMBIENT_AUDIO_VOLUME;
    return Math.min(1, Math.max(0, parsed));
};

export const persistAmbientAudioSettings = (
    updateUserSettings: ((settings: Record<string, any>) => void) | null | undefined,
    updates: AmbientAudioSettingsUpdate
) => {
    updateUserSettings?.(updates);
    queueAccountSettingsSync(updates);

    if (typeof window === 'undefined') return;

    if (typeof updates.ambientAudioEnabled === 'boolean') {
        window.localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEYS.enabled, String(updates.ambientAudioEnabled));
    }

    if (typeof updates.ambientAudioVolume === 'number') {
        window.localStorage.setItem(
            AMBIENT_AUDIO_STORAGE_KEYS.volume,
            String(clampAmbientAudioVolume(updates.ambientAudioVolume))
        );
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'ambientAudioTrackId')) {
        if (typeof updates.ambientAudioTrackId === 'string' && updates.ambientAudioTrackId) {
            window.localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEYS.trackId, updates.ambientAudioTrackId);
        } else {
            window.localStorage.removeItem(AMBIENT_AUDIO_STORAGE_KEYS.trackId);
        }
    }

    emitAmbientAudioSettingsUpdated();
};

export const resolveAmbientAudioSettings = (userSettings?: Record<string, any> | null): AmbientAudioSettings => ({
    enabled:
        typeof userSettings?.ambientAudioEnabled === 'boolean'
            ? userSettings.ambientAudioEnabled
            : readStoredBoolean(AMBIENT_AUDIO_STORAGE_KEYS.enabled, true),
    volume:
        typeof userSettings?.ambientAudioVolume === 'number'
            ? clampAmbientAudioVolume(userSettings.ambientAudioVolume)
            : clampAmbientAudioVolume(
                typeof window !== 'undefined'
                    ? window.localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEYS.volume)
                    : DEFAULT_AMBIENT_AUDIO_VOLUME
            ),
    trackId:
        userSettings && Object.prototype.hasOwnProperty.call(userSettings, 'ambientAudioTrackId')
            ? (typeof userSettings.ambientAudioTrackId === 'string' && userSettings.ambientAudioTrackId.trim()
                ? userSettings.ambientAudioTrackId
                : null)
            : readStoredTrackId(AMBIENT_AUDIO_STORAGE_KEYS.trackId),
});

export const resolveAmbientSceneTrackMap = (userSettings?: Record<string, any> | null): AmbientSceneTrackMap => {
    if (userSettings && Object.prototype.hasOwnProperty.call(userSettings, 'ambientSceneTrackMap')) {
        return sanitizeSceneTrackMap(userSettings.ambientSceneTrackMap);
    }
    return readStoredSceneTrackMap();
};

export const persistAmbientSceneTrackMap = (updates: AmbientSceneTrackMap) => {
    const nextMap = sanitizeSceneTrackMap(updates);
    queueAccountSettingsSync({ ambientSceneTrackMap: nextMap });

    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEYS.sceneTrackMap, JSON.stringify(nextMap));
    emitAmbientAudioSettingsUpdated();
};

export const formatAmbientTrackSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    const megabytes = bytes / (1024 * 1024);
    if (megabytes < 1) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
};

const normalizeRemoteTrack = (track: AmbientAudioCatalogTrack): AmbientAudioTrackMeta | null => {
    if (!track || typeof track !== 'object') return null;
    if (typeof track.id !== 'string' || !track.id.trim()) return null;
    if (typeof track.name !== 'string' || !track.name.trim()) return null;
    if (typeof track.url !== 'string' || !track.url.trim()) return null;

    const url = track.url.trim();
    if (!url.startsWith('/') && !/^https:\/\//i.test(url)) return null;

    const sceneIds = Array.isArray(track.sceneIds)
        ? track.sceneIds.filter((value): value is RitualSceneId => RITUAL_SCENE_IDS.includes(value as RitualSceneId))
        : undefined;

    return {
        id: track.id.trim(),
        name: track.name.trim(),
        type: typeof track.type === 'string' && track.type.trim() ? track.type.trim() : 'audio/mpeg',
        size: Number.isFinite(track.size) && Number(track.size) > 0 ? Number(track.size) : 0,
        uploadedAt:
            typeof track.uploadedAt === 'string' && Number.isFinite(Date.parse(track.uploadedAt))
                ? track.uploadedAt
                : '1970-01-01T00:00:00.000Z',
        source: 'remote',
        url,
        sceneIds,
    };
};

const loadRemoteAmbientCatalog = async (): Promise<AmbientAudioCatalog> => {
    if (typeof window === 'undefined') return { tracks: [], channels: [] };
    if (!remoteCatalogPromise) {
        remoteCatalogPromise = fetch(AMBIENT_AUDIO_CATALOG_URL, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-cache',
        })
            .then(async (response) => {
                if (!response.ok) return { tracks: [], channels: [] };
                const payload = await response.json();
                if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                    return { tracks: [], channels: [] };
                }
                return payload as AmbientAudioCatalog;
            })
            .catch(() => ({ tracks: [], channels: [] }));
    }
    return remoteCatalogPromise;
};

export const refreshAmbientAudioCatalog = () => {
    remoteCatalogPromise = null;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT));
    }
};

const listRemoteAmbientAudioTracks = async (): Promise<AmbientAudioTrackMeta[]> => {
    const catalog = await loadRemoteAmbientCatalog();
    if (!Array.isArray(catalog.tracks)) return [];
    return catalog.tracks
        .map(normalizeRemoteTrack)
        .filter((track): track is AmbientAudioTrackMeta => Boolean(track));
};

export const listAmbientRadioChannels = async (): Promise<AmbientRadioChannel[]> => {
    const catalog = await loadRemoteAmbientCatalog();
    if (!Array.isArray(catalog.channels)) return [];

    return catalog.channels.filter((channel): channel is AmbientRadioChannel => (
        Boolean(channel)
        && RITUAL_SCENE_IDS.includes(channel.id)
        && typeof channel.label === 'string'
        && typeof channel.timeRange === 'string'
    ));
};

const getRemoteAmbientAudioTrack = async (trackId: string) => {
    const tracks = await listRemoteAmbientAudioTracks();
    return tracks.find((track) => track.id === trackId) ?? null;
};

const openAmbientAudioDb = async () => {
    if (!supportsIndexedDb()) {
        throw new Error('IndexedDB is not available in this browser.');
    }

    if (!ambientAudioDbPromise) {
        ambientAudioDbPromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => db.close();
                resolve(db);
            };

            request.onerror = () => {
                reject(request.error ?? new Error('Failed to open ambient audio database.'));
            };
        });
    }

    return ambientAudioDbPromise;
};

const runAmbientAudioRequest = async <T>(
    mode: IDBTransactionMode,
    execute: (store: IDBObjectStore) => IDBRequest<T>
) => {
    const db = await openAmbientAudioDb();

    return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = execute(store);

        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error ?? new Error('Ambient audio request failed.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Ambient audio transaction aborted.'));
    });
};

const listLocalAmbientAudioTracks = async (): Promise<AmbientAudioTrackMeta[]> => {
    if (!supportsIndexedDb()) return [];
    try {
        const records = await runAmbientAudioRequest<AmbientAudioTrackRecord[]>('readonly', (store) => store.getAll());
        return records.map(({ blob: _blob, ...meta }) => ({ ...meta, source: 'local' as const }));
    } catch {
        return [];
    }
};

export const listAmbientAudioTracks = async (): Promise<AmbientAudioTrackMeta[]> => {
    const [remoteTracks, localTracks] = await Promise.all([
        listRemoteAmbientAudioTracks(),
        listLocalAmbientAudioTracks(),
    ]);

    const byId = new Map<string, AmbientAudioTrackMeta>();
    for (const track of remoteTracks) byId.set(track.id, track);
    for (const track of localTracks) {
        if (!byId.has(track.id)) byId.set(track.id, track);
    }

    return [...byId.values()].sort((left, right) => {
        if (left.source !== right.source) return left.source === 'remote' ? -1 : 1;
        return new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime();
    });
};

export const storeAmbientAudioFiles = async (files: File[]) => {
    const storedTracks: AmbientAudioTrackMeta[] = [];

    for (const file of files) {
        const track: AmbientAudioTrackRecord = {
            id: `ambient-track-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            name: file.name,
            type: file.type || 'audio/mpeg',
            size: file.size,
            uploadedAt: new Date().toISOString(),
            source: 'local',
            blob: file,
        };

        await runAmbientAudioRequest<IDBValidKey>('readwrite', (store) => store.put(track));
        storedTracks.push({
            id: track.id,
            name: track.name,
            type: track.type,
            size: track.size,
            uploadedAt: track.uploadedAt,
            source: 'local',
        });
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT));
    }

    return storedTracks;
};

export const getAmbientAudioTrackBlob = async (trackId: string) => {
    const remoteTrack = await getRemoteAmbientAudioTrack(trackId);
    if (remoteTrack?.url) {
        try {
            const response = await fetch(remoteTrack.url, {
                method: 'GET',
                credentials: remoteTrack.url.startsWith('/') ? 'same-origin' : 'omit',
                cache: 'force-cache',
            });
            if (response.ok) return await response.blob();
        } catch {
            // Fall through to the local library. A remote outage must not break
            // a user's locally imported soundtrack.
        }
    }

    if (!supportsIndexedDb()) return null;
    try {
        const record = await runAmbientAudioRequest<AmbientAudioTrackRecord | undefined>('readonly', (store) => store.get(trackId));
        return record?.blob ?? null;
    } catch {
        return null;
    }
};

export const removeAmbientAudioTrack = async (trackId: string) => {
    const remoteTrack = await getRemoteAmbientAudioTrack(trackId);
    if (remoteTrack) {
        throw new Error('Remote ambient tracks are managed by the SAIMÔR Ambient catalog.');
    }

    await runAmbientAudioRequest<undefined>('readwrite', (store) => store.delete(trackId));

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT));
    }
};

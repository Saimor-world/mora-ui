'use client';

export interface AmbientAudioTrackMeta {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
}

interface AmbientAudioTrackRecord extends AmbientAudioTrackMeta {
    blob: Blob;
}

export interface AmbientAudioSettings {
    enabled: boolean;
    volume: number;
    trackId: string | null;
}

export interface AmbientAudioSettingsUpdate {
    ambientAudioEnabled?: boolean;
    ambientAudioVolume?: number;
    ambientAudioTrackId?: string | null;
}

export const DEFAULT_AMBIENT_AUDIO_VOLUME = 0.42;

export const AMBIENT_AUDIO_STORAGE_KEYS = {
    enabled: 'saimor_ambient_audio_enabled',
    volume: 'saimor_ambient_audio_volume',
    trackId: 'saimor_ambient_audio_track_id',
} as const;

export const AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT = 'saimor-ambient-audio-library-updated';

const DB_NAME = 'saimor-ambient-audio';
const STORE_NAME = 'tracks';

let ambientAudioDbPromise: Promise<IDBDatabase> | null = null;

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
};

export const resolveAmbientAudioSettings = (userSettings?: Record<string, any> | null): AmbientAudioSettings => ({
    enabled:
        typeof userSettings?.ambientAudioEnabled === 'boolean'
            ? userSettings.ambientAudioEnabled
            : readStoredBoolean(AMBIENT_AUDIO_STORAGE_KEYS.enabled, false),
    volume:
        typeof userSettings?.ambientAudioVolume === 'number'
            ? clampAmbientAudioVolume(userSettings.ambientAudioVolume)
            : clampAmbientAudioVolume(
                typeof window !== 'undefined'
                    ? window.localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEYS.volume)
                    : DEFAULT_AMBIENT_AUDIO_VOLUME
            ),
    trackId:
        typeof userSettings?.ambientAudioTrackId === 'string'
            ? userSettings.ambientAudioTrackId
            : readStoredTrackId(AMBIENT_AUDIO_STORAGE_KEYS.trackId),
});

export const formatAmbientTrackSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    const megabytes = bytes / (1024 * 1024);
    if (megabytes < 1) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
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

export const listAmbientAudioTracks = async (): Promise<AmbientAudioTrackMeta[]> => {
    const records = await runAmbientAudioRequest<AmbientAudioTrackRecord[]>('readonly', (store) => store.getAll());
    return records
        .map(({ blob: _blob, ...meta }) => meta)
        .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime());
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
            blob: file,
        };

        await runAmbientAudioRequest<IDBValidKey>('readwrite', (store) => store.put(track));
        storedTracks.push({
            id: track.id,
            name: track.name,
            type: track.type,
            size: track.size,
            uploadedAt: track.uploadedAt,
        });
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT));
    }

    return storedTracks;
};

export const getAmbientAudioTrackBlob = async (trackId: string) => {
    const record = await runAmbientAudioRequest<AmbientAudioTrackRecord | undefined>('readonly', (store) => store.get(trackId));
    return record?.blob ?? null;
};

export const removeAmbientAudioTrack = async (trackId: string) => {
    await runAmbientAudioRequest<undefined>('readwrite', (store) => store.delete(trackId));

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT));
    }
};

'use client';

export const LOCAL_PRIVATE_FILES_KEY = 'saimor_local_files_v1';
export const LOCAL_PRIVATE_FILES_CHANGED = 'saimor:local-private-files-changed';
export const LOCAL_PRIVATE_FILE_LIMIT = 8 * 1024 * 1024;

export type LocalPrivateFileRecord = {
    id: string;
    source: 'local';
    name: string;
    mime: string;
    size: number;
    updatedAt: string;
    text?: string;
    dataUrl?: string;
};

export function readLocalPrivateFiles(): LocalPrivateFileRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(LOCAL_PRIVATE_FILES_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function writeLocalPrivateFiles(files: LocalPrivateFileRecord[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_PRIVATE_FILES_KEY, JSON.stringify(files.slice(0, 80)));
    window.dispatchEvent(new CustomEvent(LOCAL_PRIVATE_FILES_CHANGED));
}

export function makeLocalPrivateTextFile(name: string, text: string): LocalPrivateFileRecord {
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        source: 'local',
        name,
        mime: 'text/markdown',
        size: new Blob([text]).size,
        updatedAt: new Date().toISOString(),
        text,
    };
}

export function saveLocalPrivateTextFile(name: string, text: string): LocalPrivateFileRecord {
    const existing = readLocalPrivateFiles();
    const file = makeLocalPrivateTextFile(name, text);
    writeLocalPrivateFiles([file, ...existing]);
    return file;
}

export function localPrivateRecordToFile(record: LocalPrivateFileRecord): File {
    if (record.text != null) {
        return new window.File([record.text], record.name, { type: record.mime || 'text/plain' });
    }

    const dataUrl = record.dataUrl || '';
    const [header, body] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] || record.mime || 'application/octet-stream';
    const binary = atob(body || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new window.File([bytes], record.name, { type: mime });
}

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Cloud,
    Download,
    File as FileIcon,
    FileImage,
    FileText,
    FolderOpen,
    HardDrive,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Server,
    Sparkles,
    Trash2,
    UploadCloud,
    type LucideIcon,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import { fetchMyContent, type UserContentResponse } from '@/lib/api/contentClient';
import {
    deleteCompanyFile,
    downloadCompanyFile,
    getFileNode,
    listCompanyFiles,
    requestCreateNodeFromFile,
    uploadCompanyFile,
    type CompanyFileRecord,
} from '@/lib/api/filesClient';
import { toast } from '@/lib/toast';
import type { AppProps } from '@/lib/apps/types';

type LocalFileRecord = {
    id: string;
    source: 'local';
    name: string;
    mime: string;
    size: number;
    updatedAt: string;
    text?: string;
    dataUrl?: string;
};

type UnifiedFile = {
    id: string;
    source: 'core' | 'local';
    name: string;
    mime: string;
    size: number;
    updatedAt: string;
    linkedNodeId?: string | null;
    fileId?: string;
    sourceAvailable?: boolean;
    text?: string;
    dataUrl?: string;
};

type SourceFilter = 'all' | 'local' | 'core' | 'cloud';

const LOCAL_FILES_KEY = 'saimor_local_files_v1';
const LOCAL_FILE_LIMIT = 8 * 1024 * 1024;

function formatBytes(size?: number | null) {
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readLocalFiles(): LocalFileRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(LOCAL_FILES_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeLocalFiles(files: LocalFileRecord[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(files.slice(0, 80)));
}

function fileToLocalRecord(file: File): Promise<LocalFileRecord> {
    if (file.size > LOCAL_FILE_LIMIT) {
        return Promise.reject(new Error('Lokale Datei ist groesser als 8 MB. Bitte direkt in den OS-Speicher hochladen.'));
    }

    const isText = file.type.startsWith('text/')
        || /\.(md|txt|json|csv|log|xml|html|css|js|ts|tsx)$/i.test(file.name);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
        reader.onload = () => {
            resolve({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                source: 'local',
                name: file.name,
                mime: file.type || 'application/octet-stream',
                size: file.size,
                updatedAt: new Date().toISOString(),
                ...(isText ? { text: String(reader.result || '') } : { dataUrl: String(reader.result || '') }),
            });
        };
        if (isText) reader.readAsText(file);
        else reader.readAsDataURL(file);
    });
}

function localRecordToFile(record: LocalFileRecord): File {
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

function toUnifiedFile(file: CompanyFileRecord): UnifiedFile {
    return {
        id: `core-${file.id}`,
        source: 'core',
        fileId: file.id,
        name: file.filename,
        mime: file.mime || 'application/octet-stream',
        size: file.size,
        updatedAt: file.created_at,
        linkedNodeId: file.linked_node_id,
        sourceAvailable: file.source_available ?? file.source_status !== 'missing',
    };
}

export default function MeineDateienApp({ paneId }: AppProps) {
    const {
        getPane,
        removePane,
        minimizePane,
        focusPane,
        updatePanePosition,
        updatePaneSize,
        openPane,
    } = usePaneStore();
    const activeCompanyId = useNavStore((state) => state.activeCompanyId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);
    const pane = getPane(paneId);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [content, setContent] = useState<UserContentResponse | null>(null);
    const [coreFiles, setCoreFiles] = useState<CompanyFileRecord[]>([]);
    const [localFiles, setLocalFiles] = useState<LocalFileRecord[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draftText, setDraftText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

    const loadContent = useCallback(async () => {
        setIsLoading(true);
        try {
            const [myContent, files] = await Promise.all([
                fetchMyContent().catch(() => null),
                activeCompanyId ? listCompanyFiles(activeCompanyId).catch(() => []) : Promise.resolve([]),
            ]);
            setContent(myContent);
            setCoreFiles(files);
            setLocalFiles(readLocalFiles());
        } finally {
            setIsLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => {
        void loadContent();
    }, [loadContent]);

    const files = useMemo<UnifiedFile[]>(() => {
        const fromCore = coreFiles.map(toUnifiedFile);
        const local = localFiles.map((file) => ({
            id: `local-${file.id}`,
            source: 'local' as const,
            name: file.name,
            mime: file.mime,
            size: file.size,
            updatedAt: file.updatedAt,
            text: file.text,
            dataUrl: file.dataUrl,
        }));
        return [...local, ...fromCore].sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));
    }, [coreFiles, localFiles]);

    const selectedFile = useMemo(() => files.find((file) => file.id === selectedId) || files[0] || null, [files, selectedId]);
    const cloudCount = content?.cloud_storage?.connectors?.length ?? content?.cloud_storage?.count ?? 0;
    const filteredFiles = useMemo(() => {
        if (sourceFilter === 'local') return files.filter((file) => file.source === 'local');
        if (sourceFilter === 'core') return files.filter((file) => file.source === 'core');
        if (sourceFilter === 'cloud') return [];
        return files;
    }, [files, sourceFilter]);

    useEffect(() => {
        if (!selectedFile) {
            setDraftText('');
            return;
        }
        setDraftText(selectedFile.text || '');
    }, [selectedFile?.id, selectedFile?.text]);

    const persistLocalFiles = useCallback((next: LocalFileRecord[]) => {
        setLocalFiles(next);
        writeLocalFiles(next);
    }, []);

    const importFiles = useCallback(async (incoming: FileList | File[]) => {
        const selected = Array.from(incoming);
        if (!selected.length) return;

        const localResults: LocalFileRecord[] = [];
        for (const file of selected) {
            try {
                if (activeCompanyId) {
                    setIsUploading(true);
                    const uploaded = await uploadCompanyFile(file, activeCompanyId, 'private');
                    try {
                        await requestCreateNodeFromFile(uploaded.id, { autoExecute: true });
                    } catch {
                        // Upload still succeeded; node intake can be retried from the file list.
                    }
                } else {
                    localResults.push(await fileToLocalRecord(file));
                }
            } catch (error: any) {
                toast.error(error?.message || `${file.name} konnte nicht importiert werden`);
            } finally {
                setIsUploading(false);
            }
        }

        if (localResults.length) {
            const next = [...localResults, ...readLocalFiles()];
            persistLocalFiles(next);
            setSelectedId(`local-${localResults[0].id}`);
            toast.success(`${localResults.length} lokale Datei${localResults.length === 1 ? '' : 'en'} importiert`);
        }

        if (activeCompanyId) {
            toast.success('Datei in den Workspace geladen');
            await loadContent();
        }
    }, [activeCompanyId, loadContent, persistLocalFiles]);

    const createLocalNote = useCallback(() => {
        const now = new Date().toISOString();
        const note: LocalFileRecord = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            source: 'local',
            name: 'Neue Notiz.md',
            mime: 'text/markdown',
            size: 0,
            updatedAt: now,
            text: '# Neue Notiz\n\n',
        };
        persistLocalFiles([note, ...localFiles]);
        setSelectedId(`local-${note.id}`);
        toast.success('Lokale Notiz angelegt');
    }, [localFiles, persistLocalFiles]);

    const saveLocalDraft = useCallback(() => {
        if (!selectedFile || selectedFile.source !== 'local') return;
        const localId = selectedFile.id.replace(/^local-/, '');
        const next = localFiles.map((file) => {
            if (file.id !== localId) return file;
            return {
                ...file,
                text: draftText,
                size: new Blob([draftText]).size,
                updatedAt: new Date().toISOString(),
            };
        });
        persistLocalFiles(next);
        toast.success('Lokal gespeichert');
    }, [draftText, localFiles, persistLocalFiles, selectedFile]);

    const uploadLocalToCore = useCallback(async () => {
        if (!activeCompanyId || !selectedFile || selectedFile.source !== 'local') return;
        const local = localFiles.find((file) => `local-${file.id}` === selectedFile.id);
        if (!local) return;
        setIsUploading(true);
        try {
            const uploaded = await uploadCompanyFile(localRecordToFile({ ...local, text: draftText || local.text }), activeCompanyId, 'private');
            await requestCreateNodeFromFile(uploaded.id, { autoExecute: true }).catch(() => null);
            const next = localFiles.filter((file) => file.id !== local.id);
            persistLocalFiles(next);
            setSelectedId(`core-${uploaded.id}`);
            await loadContent();
            toast.success('Lokale Datei im OS gesichert');
        } catch (error: any) {
            toast.error(error?.message || 'Sichern im OS fehlgeschlagen');
        } finally {
            setIsUploading(false);
        }
    }, [activeCompanyId, draftText, loadContent, localFiles, persistLocalFiles, selectedFile]);

    const openSelected = useCallback(async () => {
        if (!selectedFile) return;
        if (selectedFile.source === 'local') return;

        if (selectedFile.linkedNodeId) {
            openPane({
                id: `document-${selectedFile.linkedNodeId}`,
                type: 'document',
                title: selectedFile.name,
                size: { width: 860, height: 680 },
                data: {
                    nodeId: selectedFile.linkedNodeId,
                    name: selectedFile.name,
                    type: selectedFile.name.split('.').pop()?.toLowerCase(),
                    metadata: { source_file_id: selectedFile.fileId, original_filename: selectedFile.name },
                },
            });
            return;
        }

        if (!selectedFile.fileId) return;
        try {
            const status = await getFileNode(selectedFile.fileId);
            if (status?.node_id) {
                openPane({
                    id: `document-${status.node_id}`,
                    type: 'document',
                    title: selectedFile.name,
                    size: { width: 860, height: 680 },
                    data: {
                        nodeId: status.node_id,
                        name: selectedFile.name,
                        folderId: status.folder_id,
                        companyId: status.company_id || activeCompanyId || undefined,
                        metadata: { source_file_id: selectedFile.fileId, original_filename: selectedFile.name },
                    },
                });
                return;
            }
            await requestCreateNodeFromFile(selectedFile.fileId, { autoExecute: true });
            await loadContent();
            toast.success('Dokument aus Datei erzeugt');
        } catch (error: any) {
            toast.error(error?.message || 'Dokument konnte nicht geoeffnet werden');
        }
    }, [activeCompanyId, loadContent, openPane, selectedFile]);

    const downloadSelected = useCallback(async () => {
        if (!selectedFile) return;
        if (selectedFile.source === 'local') {
            const blob = new Blob([selectedFile.text ?? draftText], { type: selectedFile.mime || 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = selectedFile.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            return;
        }
        if (selectedFile.fileId) await downloadCompanyFile(selectedFile.fileId, selectedFile.name);
    }, [draftText, selectedFile]);

    const deleteSelected = useCallback(async () => {
        if (!selectedFile) return;
        if (selectedFile.source === 'local') {
            const localId = selectedFile.id.replace(/^local-/, '');
            persistLocalFiles(localFiles.filter((file) => file.id !== localId));
            setSelectedId(null);
            toast.success('Lokale Datei entfernt');
            return;
        }
        if (!selectedFile.fileId) return;
        try {
            await deleteCompanyFile(selectedFile.fileId);
            await loadContent();
            setSelectedId(null);
            toast.success('Datei entfernt');
        } catch (error: any) {
            toast.error(error?.message || 'Datei konnte nicht entfernt werden');
        }
    }, [loadContent, localFiles, persistLocalFiles, selectedFile]);

    if (!pane) return null;

    const canEditSelected = selectedFile?.source === 'local' && (selectedFile.text != null || selectedFile.mime.startsWith('text/'));
    const selectedIsPdf = selectedFile?.mime === 'application/pdf' || /\.pdf$/i.test(selectedFile?.name || '');
    const selectedIsImage = selectedFile?.mime.startsWith('image/');

    return (
        <GlassPanel
            title="Meine Dateien"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            padding={0}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full min-h-0 bg-black/10">
                <aside className="flex w-[310px] shrink-0 flex-col border-r border-white/[0.07] bg-black/20">
                    <div className="space-y-3 border-b border-white/[0.07] p-4">
                        <div className="rounded-2xl border border-emerald-300/12 bg-emerald-500/[0.055] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/45">Mein Universum</p>
                                    <p className="mt-1 text-sm font-medium text-white/84">Private Dateien</p>
                                </div>
                                <HardDrive size={17} className="shrink-0 text-emerald-100/60" />
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-white/42">
                                Dein Account bleibt der Besitzer. Lokal bleibt nur auf diesem Geraet, OS-Speicher ist geschuetzt im HQ, Cloud verbindet spaeter externe Laufwerke.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Metric icon={HardDrive} label="Geraet" value={localFiles.length} />
                            <Metric icon={Server} label="OS" value={coreFiles.length} />
                            <Metric icon={Cloud} label="Cloud" value={cloudCount} />
                        </div>
                        <div
                            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragActive(false);
                                void importFiles(event.dataTransfer.files);
                            }}
                            className={`rounded-2xl border border-dashed p-4 transition-colors ${dragActive ? 'border-emerald-300/60 bg-emerald-500/12' : 'border-white/12 bg-white/[0.03]'}`}
                        >
                            <div className="flex items-start gap-3">
                                <UploadCloud className="mt-0.5 text-emerald-200/75" size={18} />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white/85">Dateien hier ablegen</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-white/42">
                                        {activeCompanyId ? 'Wird als private OS-Datei in deinem aktuellen Arbeitskontext gesichert.' : 'Ohne aktiven Workspace bleibt die Datei nur auf diesem Geraet.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/12 px-3 py-2 text-xs font-medium text-emerald-50 hover:bg-emerald-500/18"
                            >
                                <UploadCloud size={14} /> Import
                            </button>
                            <button
                                type="button"
                                onClick={createLocalNote}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/72 hover:bg-white/[0.08]"
                            >
                                <Plus size={14} /> Notiz
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                                if (event.target.files) void importFiles(event.target.files);
                                event.currentTarget.value = '';
                            }}
                        />
                    </div>

                    <div className="border-b border-white/[0.06] px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">Arbeitsdateien</span>
                            <button
                                type="button"
                                onClick={() => void loadContent()}
                                className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.06] hover:text-white"
                                title="Aktualisieren"
                            >
                                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-white/[0.07] bg-black/22 p-1">
                            {([
                                ['all', 'Alle'],
                                ['local', 'Geraet'],
                                ['core', 'OS'],
                                ['cloud', 'Cloud'],
                            ] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setSourceFilter(value)}
                                    className={`rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors ${sourceFilter === value ? 'bg-white/12 text-white' : 'text-white/42 hover:bg-white/[0.06] hover:text-white/70'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {sourceFilter === 'cloud' && (
                            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                                Cloud ist vorbereitet. Sobald ein Connector aktiv ist, erscheinen Drive-, OneDrive- oder andere Quellen hier neben Geraet und OS-Speicher.
                            </p>
                        )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto p-2">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center text-white/35">
                                <Loader2 size={18} className="animate-spin" />
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="px-3 py-10 text-center">
                                <FileText size={24} className="mx-auto text-white/25" />
                                <p className="mt-3 text-sm text-white/58">{sourceFilter === 'all' ? 'Noch keine Dateien' : 'Keine Dateien in dieser Ansicht'}</p>
                                <p className="mt-1 text-xs text-white/32">{sourceFilter === 'cloud' ? 'Cloud-Connectoren kommen als naechster Schritt.' : 'Importiere PDFs, Texte oder Bilder.'}</p>
                            </div>
                        ) : filteredFiles.map((file) => (
                            <button
                                key={file.id}
                                type="button"
                                onClick={() => setSelectedId(file.id)}
                                className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${selectedFile?.id === file.id ? 'border-emerald-300/24 bg-emerald-500/12' : 'border-transparent hover:border-white/8 hover:bg-white/[0.04]'}`}
                            >
                                <FileKindIcon file={file} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-white/78">{file.name}</p>
                                    <p className="mt-0.5 truncate text-[11px] text-white/35">
                                        {file.source === 'local' ? 'Nur dieses Geraet' : file.linkedNodeId ? 'OS-Datei + Dokument' : 'Private OS-Datei'} - {formatBytes(file.size)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white/82">{selectedFile?.name || 'Keine Datei ausgewaehlt'}</p>
                            <p className="mt-0.5 text-[11px] text-white/35">
                                {selectedFile ? `${selectedFile.source === 'local' ? 'Nur dieses Geraet' : 'Private OS-Datei'} - ${selectedFile.mime || 'Datei'} - ${formatBytes(selectedFile.size)}` : 'Importiere eine Datei oder lege eine Notiz an.'}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {selectedFile?.source === 'local' && activeCompanyId && (
                                <button type="button" onClick={() => void uploadLocalToCore()} disabled={isUploading}
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/12 px-3 py-2 text-xs font-medium text-emerald-50 hover:bg-emerald-500/18 disabled:opacity-50">
                                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />} In OS sichern
                                </button>
                            )}
                            {selectedFile?.source === 'core' && (
                                <button type="button" onClick={() => void openSelected()}
                                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/18 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-50 hover:bg-cyan-500/16">
                                    <FolderOpen size={14} /> Oeffnen
                                </button>
                            )}
                            {canEditSelected && (
                                <button type="button" onClick={saveLocalDraft}
                                    className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white/68 hover:bg-white/[0.08]"
                                    title="Speichern">
                                    <Save size={15} />
                                </button>
                            )}
                            {selectedFile && (
                                <>
                                    <button type="button" onClick={() => void downloadSelected()}
                                        className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white/68 hover:bg-white/[0.08]"
                                        title="Herunterladen">
                                        <Download size={15} />
                                    </button>
                                    <button type="button" onClick={() => void deleteSelected()}
                                        className="rounded-xl border border-red-300/14 bg-red-500/8 p-2 text-red-100/70 hover:bg-red-500/14"
                                        title="Entfernen">
                                        <Trash2 size={15} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto">
                        {!selectedFile ? (
                            <EmptyPreview />
                        ) : canEditSelected ? (
                            <div className="flex h-full flex-col">
                                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/32">
                                    <Pencil size={12} /> Lokaler Editor
                                </div>
                                <textarea
                                    value={draftText}
                                    onChange={(event) => setDraftText(event.target.value)}
                                    spellCheck={false}
                                    className="h-full min-h-[320px] flex-1 resize-none bg-black/24 p-5 font-mono text-sm leading-6 text-white/82 outline-none placeholder:text-white/20"
                                    placeholder="Schreibe hier..."
                                />
                            </div>
                        ) : selectedFile.source === 'local' && selectedIsPdf && selectedFile.dataUrl ? (
                            <iframe src={selectedFile.dataUrl} title={selectedFile.name} className="h-full min-h-[420px] w-full border-0 bg-white" />
                        ) : selectedFile.source === 'local' && selectedIsImage && selectedFile.dataUrl ? (
                            <div className="flex h-full items-center justify-center bg-black/28 p-5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={selectedFile.dataUrl} alt={selectedFile.name} className="max-h-full max-w-full rounded-lg object-contain" />
                            </div>
                        ) : (
                            <div className="flex h-full min-h-[420px] items-center justify-center p-6">
                                <div className="max-w-md text-center">
                                    <Sparkles size={28} className="mx-auto text-emerald-200/60" />
                                    <h3 className="mt-4 text-lg font-medium text-white/86">Datei liegt bereit</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-white/42">
                                        {selectedFile.source === 'core'
                                            ? 'Diese Datei liegt in deinem geschuetzten OS-Speicher. Oeffne das erzeugte Dokument oder lade die Originaldatei herunter.'
                                            : 'Diese Datei liegt lokal. PDF und Bilder werden direkt angezeigt, Textdateien sind editierbar.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </GlassPanel>
    );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-white/32">{label}</span>
                <Icon size={12} className="text-white/28" />
            </div>
            <p className="mt-2 text-lg text-white/88">{value}</p>
        </div>
    );
}

function FileKindIcon({ file }: { file: UnifiedFile }) {
    const className = file.source === 'local' ? 'text-amber-200/70' : 'text-cyan-200/70';
    if (file.mime === 'application/pdf' || /\.pdf$/i.test(file.name)) return <FileIcon className={className} size={18} />;
    if (file.mime.startsWith('image/')) return <FileImage className={className} size={18} />;
    return <FileText className={className} size={18} />;
}

function EmptyPreview() {
    return (
        <div className="flex h-full min-h-[420px] items-center justify-center p-6">
            <div className="max-w-sm text-center">
                <HardDrive size={30} className="mx-auto text-white/25" />
                <h3 className="mt-4 text-lg font-medium text-white/78">Local-first Arbeitsplatz</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Dateien koennen lokal entstehen, bearbeitet werden und spaeter bewusst im geschuetzten OS-Speicher gesichert werden.
                </p>
            </div>
        </div>
    );
}

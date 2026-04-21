'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Copy, Download, File, FileImage, FileText, FileVideo, FolderOpen,
    Link, Loader2, Paperclip, RefreshCw, Search, Sparkles, UploadCloud, X,
} from 'lucide-react';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { fetchNodeDetails, fetchNodeRelations } from '@/lib/api/coreClient';
import { getCompanyFileUrl } from '@/lib/api/filesClient';
import { toast } from '@/lib/toast';
import { openNavigationOutcome, type DocumentNavigationContext } from '@/lib/utils/searchOpen';
import { getNodeSourceFileId, getNodeSourceFileName, openSourceFileForNode } from '@/lib/utils/contentOpen';
import type { AppProps } from '@/lib/apps/types';

interface NodeRelation {
    type?: string;
    target_name?: string;
    source_name?: string;
}

export default function DocumentApp({ paneId, initialData = {} }: AppProps) {
    const { openPane, removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const isActive = usePaneStore(s => s.activePaneId === paneId);
    const pane = getPane(paneId);
    const docData = initialData as {
        nodeId?: string;
        content?: string;
        name?: string;
        type?: string;
        metadata?: Record<string, any>;
        url?: string;
        folderId?: string;
        companyId?: string;
        navigationContext?: DocumentNavigationContext;
    };

    const { nodeId, content: initialContent, name: initialName, type: initialType,
        metadata: initialMetadata, url, folderId, companyId, navigationContext } = docData;

    const [content, setContent] = useState(initialContent || '');
    const [name, setName] = useState(initialName || 'Dokument');
    const [type, setType] = useState(initialType || '');
    const [metadata, setMetadata] = useState<Record<string, any>>(initialMetadata || {});
    const [relations, setRelations] = useState<NodeRelation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [imageLoadError, setImageLoadError] = useState(false);
    // Ref: true during a focus-triggered background refresh — UI stays visible
    const isBackgroundRefetch = useRef(false);
    const prevIsActiveRef = useRef(false);

    // Silent refresh when the pane regains focus — picks up renames/moves from other panes
    useEffect(() => {
        if (isActive && !prevIsActiveRef.current && nodeId) {
            isBackgroundRefetch.current = true;
            setReloadKey(k => k + 1);
        }
        prevIsActiveRef.current = isActive;
    }, [isActive, nodeId]);

    useEffect(() => {
        let cancelled = false;
        async function loadDocument() {
            if (!nodeId) { setIsLoading(false); return; }
            try {
                // Block UI only on initial load; background refetches run silently
                if (!isBackgroundRefetch.current) setIsLoading(true);
                setLoadError(null);
                setImageLoadError(false);
                const nodeData = await fetchNodeDetails(nodeId);
                if (cancelled) return;
                if (!nodeData) { setLoadError('Dokument nicht gefunden oder kein Zugriff.'); return; }
                setName(nodeData.name || nodeData.title || 'Dokument');
                setContent(nodeData.content || '');
                setType(nodeData.type || '');
                setMetadata(nodeData.metadata || {});
                const nodeRelations = await fetchNodeRelations(nodeId);
                if (cancelled) return;
                setRelations(Array.isArray(nodeRelations) ? nodeRelations : []);
            } catch (error: any) {
                if (cancelled) return;
                // Background refetch errors don't replace UI with error screen
                if (!isBackgroundRefetch.current) {
                    setLoadError(error?.message || 'Dokument konnte nicht geladen werden');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                    isBackgroundRefetch.current = false;
                }
            }
        }
        void loadDocument();
        return () => { cancelled = true; };
    }, [nodeId, reloadKey]);

    const fileExtension = useMemo(() => name?.split('.').pop()?.toLowerCase() || '', [name]);
    const isPDF = fileExtension === 'pdf' || type === 'pdf';
    const isMarkdown = ['md', 'markdown'].includes(fileExtension) || type === 'markdown';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    const isVideo = ['mp4', 'webm', 'mov'].includes(fileExtension);

    const sourceFileId = getNodeSourceFileId({ metadata });
    const sourceFileName = getNodeSourceFileName({ metadata, name, title: name, id: nodeId || 'document' });
    const previewUrl = url || (sourceFileId ? getCompanyFileUrl(sourceFileId) : null);

    const navigationSourceLabel = (() => {
        switch (navigationContext?.source) {
            case 'chat': return 'Aus Mora-Chat geöffnet';
            case 'mycelium': return 'Aus Einordnung geöffnet';
            case 'work-session': return 'Aus Arbeitsplan geöffnet';
            case 'search': case 'search-popup': case 'search-pane': return 'Aus Suche geöffnet';
            default: return 'Von Mora geöffnet';
        }
    })();

    const NavigationIcon = (() => {
        switch (navigationContext?.source) {
            case 'mycelium': return UploadCloud;
            case 'search': case 'search-popup': case 'search-pane': return Search;
            default: return Sparkles;
        }
    })();

    const renderMarkdown = (md: string) =>
        md.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white/90 mt-4 mb-2">$1</h3>')
          .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white/90 mt-6 mb-3">$1</h2>')
          .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white">$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em class="text-white/70">$1</em>')
          .replace(/`(.*?)`/gim, '<code class="px-1 py-0.5 rounded bg-white/10 text-emerald-400 font-mono text-sm">$1</code>')
          .replace(/\n/gim, '<br />');

    const getRelationExplanation = (relation: NodeRelation): string => {
        switch (relation.type) {
            case 'same_folder': return 'Gleicher Ordner';
            case 'same_type': return 'Gleicher Typ';
            case 'shared_tags': return 'Gemeinsame Tags';
            case 'same_author': return 'Gleicher Autor';
            case 'semantic': return 'Aehnlicher Inhalt';
            default: return 'Verwandt';
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        toast.success('Inhalt kopiert');
    };

    const handleDownloadText = () => {
        const blob = new Blob([content], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = name || 'dokument.txt';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        toast.success('Textinhalt heruntergeladen');
    };

    const handleOpenOriginal = async () => {
        try {
            const opened = await openSourceFileForNode({ metadata, name, title: name, id: nodeId || 'document' });
            if (!opened) toast.info('Keine Originaldatei verknuepft');
        } catch (error: any) {
            toast.error(error?.message || 'Originaldatei konnte nicht geöffnet werden');
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full p-6">
                    <CommandReceipt tone="cyan" icon={Loader2} label="Dokument laedt" title={name}
                        body="Der Inhalt wird aus dem Core geladen."
                        chips={[...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []), ...(folderId ? [{ label: `Ordner: ${folderId}` }] : [])]}
                        className="w-full max-w-xl" />
                </div>
            );
        }
        if (loadError) {
            return (
                <div className="flex items-center justify-center h-full p-6">
                    <CommandReceipt tone="red" icon={X} label="Dokument nicht lesbar" title="Fehler beim Laden" body={loadError}
                        chips={[...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []), { label: 'Inhalt bleibt unveraendert' }]}
                        actions={<button type="button" onClick={() => setReloadKey((p) => p + 1)}
                            className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/14 px-3.5 py-2 text-[11px] font-medium text-red-50 transition-colors hover:border-red-300/35 hover:bg-red-500/22">
                            <RefreshCw size={13} />Erneut laden</button>}
                        className="w-full max-w-xl" />
                </div>
            );
        }
        if (isImage) {
            return (
                <div className="h-full flex items-center justify-center p-4 bg-black/20">
                    {previewUrl && !imageLoadError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt={name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onError={() => setImageLoadError(true)} />
                    ) : content ? (
                        <div className="text-center max-w-md">
                            <FileImage size={64} className="mx-auto mb-4 text-purple-400/50" />
                            <p className="text-white/70 text-sm mb-2">Bild-Beschreibung:</p>
                            <p className="text-white/50 text-sm italic">{content}</p>
                        </div>
                    ) : (
                        <div className="text-center text-white/50">
                            <FileImage size={64} className="mx-auto mb-4 text-purple-400/50" />
                            <p>{imageLoadError ? 'Bild konnte nicht geladen werden.' : 'Keine Vorschau verfuegbar'}</p>
                            {sourceFileId && (
                                <button type="button" onClick={() => void handleOpenOriginal()}
                                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[11px] font-medium text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white">
                                    <Paperclip size={13} />Originaldatei öffnen
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        }
        if (isPDF) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-6 bg-black/20">
                    <File size={64} className="text-red-400/60 mb-4" />
                    <p className="text-white/70 text-lg font-medium mb-2">{name}</p>
                    {content ? <><p className="text-white/50 text-sm text-center max-w-md mb-4">{content}</p><p className="text-white/30 text-xs">Die PDF liegt als Originaldatei vor.</p></> : <p className="text-white/40 text-sm">PDF-Dokument</p>}
                </div>
            );
        }
        if (isMarkdown && content) {
            return <div className="p-6 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
        }
        if (content) {
            return <pre className="p-4 whitespace-pre-wrap text-white/80 font-mono text-sm leading-relaxed">{content}</pre>;
        }
        return (
            <div className="flex items-center justify-center h-full p-6">
                <CommandReceipt tone="slate" icon={FileText} label="Leeres Dokument"
                    title="Dieser Eintrag hat noch keinen Textinhalt."
                    body="Mora zeigt bewusst keinen erfundenen Inhalt."
                    chips={[...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []), ...(sourceFileId ? [{ label: `Original: ${sourceFileName}` }] : [{ label: 'Keine Vorschau verfuegbar' }])]}
                    actions={sourceFileId ? (
                        <button type="button" onClick={() => void handleOpenOriginal()}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[11px] font-medium text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white">
                            <Paperclip size={13} />Originaldatei öffnen
                        </button>
                    ) : undefined}
                    className="w-full max-w-xl" />
            </div>
        );
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title={name || 'Dokument'}
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
        <div className="flex flex-col h-full">
            {navigationContext && (
                <div className="px-3 py-3 border-b border-cyan-400/10 bg-cyan-500/[0.05]">
                    <CommandReceipt tone="cyan" icon={NavigationIcon} label={navigationSourceLabel}
                        title={navigationContext.message}
                        chips={[
                            ...(navigationContext.label ? [{ label: navigationContext.label }] : []),
                            ...(navigationContext.path ? [{ label: navigationContext.path }] : []),
                        ]}
                        actions={(navigationContext.folderId || folderId) ? (
                            <button type="button"
                                onClick={() => openNavigationOutcome({
                                    title: 'Zielordner geöffnet',
                                    message: `Ich habe den Zielordner fuer ${navigationContext.label || name || 'das Dokument'} geöffnet.`,
                                    targetType: 'folder', label: navigationContext.label || name || 'Finder',
                                    path: navigationContext.path, companyId: navigationContext.companyId || companyId,
                                    folderId: navigationContext.folderId || folderId, source: navigationContext.source || 'search',
                                }, openPane)}
                                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/14 px-3.5 py-2 text-[11px] font-medium text-cyan-50 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/22">
                                <FolderOpen size={13} />Im Zielordner öffnen</button>
                        ) : null}
                        footer="Dieses Arbeitsdokument bleibt mit seinem Ursprung verknuepft." />
                </div>
            )}

            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3 min-w-0">
                    {isPDF ? <File size={18} className="text-red-400" />
                        : isImage ? <FileImage size={18} className="text-purple-400" />
                        : isVideo ? <FileVideo size={18} className="text-pink-400" />
                        : <FileText size={18} className="text-blue-400" />}
                    <span className="text-sm text-white/80 font-medium truncate max-w-[300px]">{name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] uppercase">{fileExtension || type || 'doc'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/25 text-[10px] uppercase tracking-wider">Nur lesen</span>
                    {sourceFileId && <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-100/70 text-[10px] uppercase border border-cyan-400/15">Mit Original</span>}
                </div>
                <div className="flex items-center gap-2">
                    {!isPDF && !isImage && !isVideo && content && (
                        <button onClick={() => void handleCopy()} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors" title="Inhalt kopieren"><Copy size={16} /></button>
                    )}
                    {content && (
                        <button onClick={handleDownloadText} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors" title="Textinhalt herunterladen"><Download size={16} /></button>
                    )}
                    {sourceFileId && (
                        <button onClick={() => void handleOpenOriginal()} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors" title="Originaldatei öffnen"><Paperclip size={16} /></button>
                    )}
                    {(folderId || navigationContext?.folderId) && (
                        <button
                            onClick={() => openNavigationOutcome({
                                title: 'Ordner geöffnet',
                                message: `Ordner von „${name}" wurde im Finder geöffnet.`,
                                targetType: 'folder',
                                label: name || 'Dokument',
                                folderId: folderId || navigationContext?.folderId,
                                companyId: companyId || navigationContext?.companyId,
                                source: 'search',
                            }, openPane)}
                            className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                            title="Im Ordner öffnen"
                        >
                            <FolderOpen size={16} />
                        </button>
                    )}
                    <button onClick={() => setReloadKey((p) => p + 1)} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors" title="Neu laden"><RefreshCw size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">{renderContent()}</div>

            {relations.length > 0 && (
                <div className="px-4 py-3 border-t border-white/5 bg-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Link size={14} className="text-emerald-400" />
                        <span className="text-xs text-white/60 font-medium">Warum {relations.length} Verbindung{relations.length > 1 ? 'en' : ''}?</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {relations.slice(0, 5).map((relation, index) => (
                            <span key={`${relation.type || 'relation'}-${index}`}
                                className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/50 border border-white/10"
                                title={`Verbunden mit: ${relation.target_name || relation.source_name || 'Inhalt'}`}>
                                {getRelationExplanation(relation)}
                            </span>
                        ))}
                        {relations.length > 5 && <span className="px-2 py-1 text-xs text-white/30">+{relations.length - 5} weitere</span>}
                    </div>
                </div>
            )}

            {metadata && Object.keys(metadata).length > 0 && (
                <div className="px-4 py-2 border-t border-white/5 text-[10px] text-white/30 flex items-center gap-4 flex-wrap">
                    {metadata.size && <span>Groesse: {(metadata.size / 1024).toFixed(1)} KB</span>}
                    {metadata.tags && Array.isArray(metadata.tags) && <span>Tags: {metadata.tags.join(', ')}</span>}
                    {sourceFileId && <span>Original: {sourceFileName}</span>}
                    {nodeId && <span className="font-mono">ID: {nodeId.slice(0, 8)}...</span>}
                </div>
            )}
        </div>
        </GlassPanel>
    );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
    Copy,
    Download,
    File,
    FileImage,
    FileText,
    FileVideo,
    FolderOpen,
    Link,
    Loader2,
    Paperclip,
    RefreshCw,
    Search,
    Sparkles,
    UploadCloud,
    X,
} from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { usePaneStore } from '@/lib/store/paneStore';
import { fetchNodeDetails, fetchNodeRelations } from '@/lib/api/coreClient';
import { getCompanyFileUrl } from '@/lib/api/filesClient';
import { toast } from '@/lib/toast';
import { openNavigationOutcome, type DocumentNavigationContext } from '@/lib/utils/searchOpen';
import { getNodeSourceFileId, getNodeSourceFileName, openSourceFileForNode } from '@/lib/utils/contentOpen';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';

interface DocumentPaneProps {
    id: string;
}

interface NodeRelation {
    type?: string;
    target_name?: string;
    source_name?: string;
}

export const DocumentPane: React.FC<DocumentPaneProps> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(id);
    const docData = (pane?.data || {}) as {
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

    const {
        nodeId,
        content: initialContent,
        name: initialName,
        type: initialType,
        metadata: initialMetadata,
        url,
        folderId,
        companyId,
        navigationContext,
    } = docData;
    const surfaceProfile = useSurfaceProfile();

    const [content, setContent] = useState(initialContent || '');
    const [name, setName] = useState(initialName || 'Dokument');
    const [type, setType] = useState(initialType || '');
    const [metadata, setMetadata] = useState<Record<string, any>>(initialMetadata || {});
    const [relations, setRelations] = useState<NodeRelation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadDocument() {
            if (!nodeId) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setLoadError(null);

                const nodeData = await fetchNodeDetails(nodeId);
                if (cancelled) return;

                if (!nodeData) {
                    setLoadError('Dokument nicht gefunden oder kein Zugriff.');
                    return;
                }

                setName(nodeData.name || nodeData.title || 'Dokument');
                setContent(nodeData.content || '');
                setType(nodeData.type || '');
                setMetadata(nodeData.metadata || {});

                const nodeRelations = await fetchNodeRelations(nodeId);
                if (cancelled) return;
                setRelations(Array.isArray(nodeRelations) ? nodeRelations : []);
            } catch (error: any) {
                if (cancelled) return;
                setLoadError(error?.message || 'Dokument konnte nicht geladen werden');
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadDocument();
        return () => {
            cancelled = true;
        };
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
            case 'chat':
                return 'Aus Mora-Chat geoeffnet';
            case 'mycelium':
                return 'Aus Einordnung geoeffnet';
            case 'work-session':
                return 'Aus Arbeitsplan geoeffnet';
            case 'search':
            case 'search-popup':
            case 'search-pane':
                return 'Aus Suche geoeffnet';
            default:
                return 'Von Mora geoeffnet';
        }
    })();

    const NavigationIcon = (() => {
        switch (navigationContext?.source) {
            case 'mycelium':
                return UploadCloud;
            case 'search':
            case 'search-popup':
            case 'search-pane':
                return Search;
            default:
                return Sparkles;
        }
    })();

    const renderMarkdown = (md: string) => {
        return md
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white/90 mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white/90 mt-6 mb-3">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white">$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em class="text-white/70">$1</em>')
            .replace(/`(.*?)`/gim, '<code class="px-1 py-0.5 rounded bg-white/10 text-emerald-400 font-mono text-sm">$1</code>')
            .replace(/\n/gim, '<br />');
    };

    const getRelationExplanation = (relation: NodeRelation): string => {
        switch (relation.type) {
            case 'same_folder':
                return 'Gleicher Ordner';
            case 'same_type':
                return 'Gleicher Typ';
            case 'shared_tags':
                return 'Gemeinsame Tags';
            case 'same_author':
                return 'Gleicher Autor';
            case 'semantic':
                return 'Aehnlicher Inhalt';
            default:
                return 'Verwandt';
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
            const opened = await openSourceFileForNode({
                metadata,
                name,
                title: name,
                id: nodeId || 'document',
            });
            if (!opened) {
                toast.info('Keine Quelle hinterlegt');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Quelle konnte nicht geoeffnet werden');
        }
    };

    if (!pane) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full p-6">
                    <CommandReceipt
                        tone="cyan"
                        icon={Loader2}
                        label="Dokument laedt"
                        title={name}
                        body="Der Inhalt wird aus dem Core geladen. Mora zeigt solange nur den letzten bekannten Titel und Kontext."
                        chips={[
                            ...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []),
                            ...(folderId ? [{ label: `Ordner: ${folderId}` }] : []),
                        ]}
                        className="w-full max-w-xl"
                    />
                </div>
            );
        }

        if (loadError) {
            return (
                <div className="flex items-center justify-center h-full p-6">
                    <CommandReceipt
                        tone="red"
                        icon={X}
                        label="Dokument nicht lesbar"
                        title="Fehler beim Laden"
                        body={loadError}
                        chips={[
                            ...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []),
                            { label: 'Inhalt bleibt unveraendert' },
                        ]}
                        actions={(
                            <button
                                type="button"
                                onClick={() => setReloadKey((prev) => prev + 1)}
                                className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/14 px-3.5 py-2 text-[11px] font-medium text-red-50 transition-colors hover:border-red-300/35 hover:bg-red-500/22"
                            >
                                <RefreshCw size={13} />
                                Erneut laden
                            </button>
                        )}
                        className="w-full max-w-xl"
                    />
                </div>
            );
        }

        if (isImage) {
            return (
                <div className="h-full flex items-center justify-center p-4 bg-black/20">
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- document previews may use auth-protected file URLs
                        <img src={previewUrl} alt={name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    ) : content ? (
                        <div className="text-center max-w-md">
                            <FileImage size={64} className="mx-auto mb-4 text-purple-400/50" />
                            <p className="text-white/70 text-sm mb-2">Bild-Beschreibung:</p>
                            <p className="text-white/50 text-sm italic">{content}</p>
                            <p className="text-white/30 text-xs mt-4">Es liegt keine echte Bildvorschau vor.</p>
                        </div>
                    ) : (
                        <div className="text-center text-white/50">
                            <FileImage size={64} className="mx-auto mb-4 text-purple-400/50" />
                            <p>Keine Vorschau verfuegbar</p>
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
                    {content ? (
                        <>
                            <p className="text-white/50 text-sm text-center max-w-md mb-4">{content}</p>
                            <p className="text-white/30 text-xs">Die PDF liegt als Datei vor und kann direkt geoeffnet werden.</p>
                        </>
                    ) : (
                        <p className="text-white/40 text-sm">PDF-Dokument</p>
                    )}
                </div>
            );
        }

        if (isMarkdown && content) {
            return (
                <div
                    className="p-6 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
            );
        }

        if (content) {
            return (
                <div className="px-6 py-6">
                    <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/82">
                            {content}
                        </pre>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center h-full p-6">
                <CommandReceipt
                    tone="slate"
                    icon={FileText}
                    label="Leeres Dokument"
                    title="Dieser Eintrag hat noch keinen Textinhalt."
                    body="Mora zeigt bewusst keinen erfundenen Inhalt. Wenn spaeter Text oder Metadaten geliefert werden, erscheint er hier."
                    chips={[
                        ...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []),
                        ...(sourceFileId ? [{ label: `Quelle: ${sourceFileName}` }] : [{ label: 'Keine Vorschau verfuegbar' }]),
                    ]}
                    className="w-full max-w-xl"
                />
            </div>
        );
    };

    return (
        <GlassPanel
            title={name || 'Dokument'}
            paneId={id}
            width={pane.size?.width || 800}
            height={pane.size?.height || 600}
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
            <div className="flex flex-col h-full">
                {navigationContext && (
                    <div className="px-3 py-3 border-b border-cyan-400/10 bg-cyan-500/[0.05]">
                        <CommandReceipt
                            tone="cyan"
                            icon={NavigationIcon}
                            label={navigationSourceLabel}
                            title={navigationContext.message}
                            chips={[
                                ...(navigationContext.label ? [{ label: navigationContext.label }] : []),
                                ...(navigationContext.path ? [{ label: navigationContext.path }] : []),
                                ...(folderId || navigationContext.folderId ? [{ label: `Zielordner: ${navigationContext.folderId || folderId}` }] : []),
                            ]}
                            actions={(
                                (navigationContext.folderId || folderId) ? (
                                    <button
                                        type="button"
                                        onClick={() => openNavigationOutcome({
                                            title: 'Zielordner geoeffnet',
                                            message: `Ich habe den zugehoerigen Zielordner fuer ${navigationContext.label || name || 'das Dokument'} geoeffnet.`,
                                            targetType: 'folder',
                                            label: navigationContext.label || name || 'Finder',
                                            path: navigationContext.path,
                                            companyId: navigationContext.companyId || companyId,
                                            folderId: navigationContext.folderId || folderId,
                                            source: navigationContext.source || 'search',
                                        }, openPane)}
                                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/14 px-3.5 py-2 text-[11px] font-medium text-cyan-50 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/22"
                                    >
                                        <FolderOpen size={13} />
                                        Im Zielordner oeffnen
                                    </button>
                                ) : null
                            )}
                            footer="Dieses Dokument kann eine zugrunde liegende Datei als Quelle haben. Mora zeigt diese Herkunft nur dann, wenn sie real vorhanden ist."
                        />
                    </div>
                )}

                <div className="border-b border-white/5 bg-white/[0.04] px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/34">
                                <span className={`rounded-full border px-2.5 py-1 ${surfaceProfile.isLocalTruthSurface ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200' : surfaceProfile.isPublicDemoSurface ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>
                                    {surfaceProfile.isLocalTruthSurface ? 'Local Truth' : surfaceProfile.isPublicDemoSurface ? 'Demo Mirror' : 'Standard'}
                                </span>
                                <span>Dokumentenansicht</span>
                            </div>
                            <div className="mt-3 flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/15">
                                    {isPDF ? (
                                        <File size={18} className="text-red-400" />
                                    ) : isImage ? (
                                        <FileImage size={18} className="text-purple-400" />
                                    ) : isVideo ? (
                                        <FileVideo size={18} className="text-pink-400" />
                                    ) : (
                                        <FileText size={18} className="text-blue-300" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base font-medium leading-snug text-white/90">{name}</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/48">
                                            {fileExtension || type || 'doc'}
                                        </span>
                                        {sourceFileId && (
                                            <span className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100/75">
                                                Mit Quelle
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/42">
                                        {sourceFileId
                                            ? 'Dieses Dokument ist der sichtbare Arbeitskontext. Die zugrunde liegende Datei bleibt als Quelle separat erreichbar.'
                                            : 'Dieses Dokument ist das sichtbare Arbeitsobjekt in der aktiven Instanz.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {!isPDF && !isImage && !isVideo && content && (
                                <button
                                    onClick={() => void handleCopy()}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                    title="Inhalt kopieren"
                                >
                                    <Copy size={14} />
                                    Kopieren
                                </button>
                            )}
                            {content && (
                                <button
                                    onClick={handleDownloadText}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                    title="Textinhalt herunterladen"
                                >
                                    <Download size={14} />
                                    Export
                                </button>
                            )}
                            {sourceFileId && (
                                <button
                                    onClick={() => void handleOpenOriginal()}
                                    className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/14 px-3.5 py-2 text-[11px] font-medium text-cyan-50 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/22"
                                    title="Quelle oeffnen"
                                >
                                    <Paperclip size={14} />
                                    Quelle oeffnen
                                </button>
                            )}
                            <button
                                onClick={() => setReloadKey((prev) => prev + 1)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                title="Neu laden"
                            >
                                <RefreshCw size={14} />
                                Neu laden
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {renderContent()}
                </div>

                {relations.length > 0 && (
                    <div className="px-4 py-3 border-t border-white/5 bg-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Link size={14} className="text-emerald-400" />
                            <span className="text-xs text-white/60 font-medium">
                                Verbindungen im Kontext
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {relations.slice(0, 5).map((relation, index) => (
                                <span
                                    key={`${relation.type || 'relation'}-${index}`}
                                    className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/50 border border-white/10"
                                    title={`Verbunden mit: ${relation.target_name || relation.source_name || 'Inhalt'}`}
                                >
                                    {getRelationExplanation(relation)}
                                </span>
                            ))}
                            {relations.length > 5 && (
                                <span className="px-2 py-1 text-xs text-white/30">
                                    +{relations.length - 5} weitere
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {metadata && Object.keys(metadata).length > 0 && (
                    <div className="px-4 py-2 border-t border-white/5 text-[10px] text-white/30 flex items-center gap-4 flex-wrap">
                        {metadata.size && <span>Groesse: {(metadata.size / 1024).toFixed(1)} KB</span>}
                        {metadata.tags && Array.isArray(metadata.tags) && <span>Tags: {metadata.tags.join(', ')}</span>}
                        {sourceFileId && <span>Quelle: {sourceFileName}</span>}
                        {nodeId && <span className="font-mono">ID: {nodeId.slice(0, 8)}...</span>}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
};

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { usePaneStore } from '@/lib/store/paneStore';
import { FileText, Copy, Download, File, FileImage, FileVideo, Loader2, Link, X, FolderOpen, Search, Sparkles, UploadCloud } from 'lucide-react';
import { toast } from '@/lib/toast';
import { fetchNodeDetails, fetchNodeRelations } from '@/lib/api/coreClient';
import { getDownloadUrl } from '@/lib/api/filesClient';
import { openNavigationOutcome, type DocumentNavigationContext } from '@/lib/utils/searchOpen';

interface DocumentPaneProps {
    id: string;
}

/**
 * DocumentPane - View Documents (read-only)
 * 
 * LOADS REAL DATA from backend API!
 * Supports:
 * - Markdown files (rendered)
 * - Text files (read-only)
 * - Images (preview)  
 * - PDF info
 */
export const DocumentPane: React.FC<DocumentPaneProps> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(id);

    // Get document data from pane
    const docData = pane?.data || {};
    const { nodeId, content: initialContent, name: initialName, type: initialType, metadata: initialMetadata, url, folderId, companyId, navigationContext } = docData as {
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

    const [content, setContent] = useState(initialContent || '');
    const [name, setName] = useState(initialName || 'Document');
    const [type, setType] = useState(initialType || '');
    const [metadata, setMetadata] = useState(initialMetadata || {});
    const [relations, setRelations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load real data from backend
    useEffect(() => {
        async function loadDocument() {
            if (!nodeId) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setLoadError(null);

                // Fetch node details from backend
                const nodeData = await fetchNodeDetails(nodeId);

                if (nodeData) {
                    setName(nodeData.name || nodeData.title || 'Document');
                    setContent(nodeData.content || '');
                    setType(nodeData.type || '');
                    setMetadata(nodeData.metadata || {});
                } else {
                    // fetchNodeDetails uses isOptional: returns null on 404/403/error.
                    // Without this branch the pane silently shows an empty document,
                    // giving no signal to the user that something went wrong.
                    setLoadError('Dokument nicht gefunden oder kein Zugriff.');
                }

                // Fetch relations to explain connections
                const nodeRelations = await fetchNodeRelations(nodeId);
                if (nodeRelations) {
                    setRelations(nodeRelations);
                }

            } catch (err: any) {
                console.error('Failed to load document:', err);
                setLoadError(err.message || 'Failed to load document');
            } finally {
                setIsLoading(false);
            }
        }

        loadDocument();
    }, [nodeId]);

    // Determine file type from name or type
    const fileExtension = name?.split('.').pop()?.toLowerCase() || '';
    const isPDF = fileExtension === 'pdf' || type === 'pdf';
    const isMarkdown = fileExtension === 'md' || fileExtension === 'markdown' || type === 'markdown';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    const isVideo = ['mp4', 'webm', 'mov'].includes(fileExtension);

    // Generate image URL from file_path if available
    const imageUrl = url || (metadata?.file_path && nodeId
        ? getDownloadUrl(nodeId)
        : null);

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

    // Simple markdown renderer
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

    // Get human-readable relation explanation
    const getRelationExplanation = (relation: any): string => {
        switch (relation.type) {
            case 'same_folder':
                return 'Same folder';
            case 'same_type':
                return 'Same type';
            case 'shared_tags':
                return 'Shared tags';
            case 'same_author':
                return 'Same author';
            case 'semantic':
                return 'Similar content';
            default:
                return 'Related';
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        toast.success('Inhalt kopiert');
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = name || 'document.txt';
        a.click();
        URL.revokeObjectURL(downloadUrl);
        toast.success('Datei heruntergeladen');
    };

    if (!pane) return null;

    // Get file icon based on type
    const getFileIcon = () => {
        if (isPDF) return <File size={18} className="text-red-400" />;
        if (isImage) return <FileImage size={18} className="text-purple-400" />;
        if (isVideo) return <FileVideo size={18} className="text-pink-400" />;
        if (isMarkdown) return <FileText size={18} className="text-yellow-400" />;
        return <FileText size={18} className="text-blue-400" />;
    };

    return (
        <GlassPanel
            title={name || 'Document'}
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
                            footer="Diese Datei bleibt mit ihrem Ursprung verknuepft. Mora blendet nur die Herkunft ein, die der Kontext wirklich geliefert hat."
                        />
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        {getFileIcon()}
                        <span className="text-sm text-white/80 font-medium truncate max-w-[300px]">{name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] uppercase">
                            {fileExtension || type || 'doc'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Copy */}
                        {!isPDF && !isImage && !isVideo && content && (
                            <button
                                onClick={handleCopy}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                title="Kopieren"
                            >
                                <Copy size={16} />
                            </button>
                        )}

                        {/* Download */}
                        {content && (
                            <button
                                onClick={handleDownload}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                title="Herunterladen"
                            >
                                <Download size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full p-6">
                            <CommandReceipt
                                tone="cyan"
                                icon={Loader2}
                                label="Dokument laedt"
                                title={name}
                                body="Der Inhalt wird aus dem Kern geladen. Mora zeigt solange den zuletzt bekannten Titel und Kontext an."
                                chips={[
                                    ...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []),
                                    ...(folderId ? [{ label: `Ordner: ${folderId}` }] : []),
                                ]}
                                className="w-full max-w-xl"
                            />
                        </div>
                    ) : loadError ? (
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
                                className="w-full max-w-xl"
                            />
                        </div>
                    ) : isImage ? (
                        /* Image Viewer */
                        <div className="h-full flex items-center justify-center p-4 bg-black/20">
                            {imageUrl ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- document previews may use blob/object URLs */}
                                    <img src={imageUrl} alt={name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                                </>
                            ) : content ? (
                                /* Demo image with text description (no real file) */
                                <div className="text-center max-w-md">
                                    <FileImage size={64} className="mx-auto mb-4 text-purple-400/50" />
                                    <p className="text-white/70 text-sm mb-2">Bild-Beschreibung:</p>
                                    <p className="text-white/50 text-sm italic">{content}</p>
                                    <p className="text-white/30 text-xs mt-4">(Demo-Datei - keine echte Bilddatei)</p>
                                </div>
                            ) : (
                                <div className="text-center text-white/50">
                                    <FileImage size={64} className="mx-auto mb-4 text-purple-400/50" />
                                    <p>Keine Vorschau verfügbar</p>
                                </div>
                            )}
                        </div>
                    ) : isPDF ? (
                        /* PDF View - Demo mode shows description, real files would embed viewer */
                        <div className="h-full flex flex-col items-center justify-center p-6 bg-black/20">
                            <File size={64} className="text-red-400/60 mb-4" />
                            <p className="text-white/70 text-lg font-medium mb-2">{name}</p>
                            {content ? (
                                <>
                                    <p className="text-white/50 text-sm text-center max-w-md mb-4">{content}</p>
                                    <p className="text-white/30 text-xs">(Demo-PDF - Inhaltsbeschreibung)</p>
                                </>
                            ) : (
                                <p className="text-white/40 text-sm">PDF-Dokument</p>
                            )}
                        </div>
                    ) : isMarkdown && content ? (
                        /* Markdown Rendered View */
                        <div
                            className="p-6 prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                        />
                    ) : content ? (
                        /* Plain Text View */
                        <pre className="p-4 whitespace-pre-wrap text-white/80 font-mono text-sm leading-relaxed">
                            {content}
                        </pre>
                    ) : (
                        /* Empty State */
                        <div className="flex items-center justify-center h-full p-6">
                            <CommandReceipt
                                tone="slate"
                                icon={FileText}
                                label="Leeres Dokument"
                                title="Diese Datei hat keinen Inhalt."
                                body="Mora zeigt bewusst keinen erfundenen Inhalt. Wenn spaeter Text oder Metadaten geliefert werden, erscheint er hier."
                                chips={[
                                    ...(nodeId ? [{ label: `ID: ${nodeId.slice(0, 8)}...` }] : []),
                                    { label: 'Keine Vorschau verfuegbar' },
                                ]}
                                className="w-full max-w-xl"
                            />
                        </div>
                    )}
                </div>

                {/* Relations Section - Explain WHY files are connected */}
                {relations.length > 0 && (
                    <div className="px-4 py-3 border-t border-white/5 bg-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Link size={14} className="text-emerald-400" />
                            <span className="text-xs text-white/60 font-medium">
                                Warum {relations.length} Verbindung{relations.length > 1 ? 'en' : ''}?
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {relations.slice(0, 5).map((rel, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/50 border border-white/10"
                                    title={`Verbunden mit: ${rel.target_name || rel.source_name || 'Datei'}`}
                                >
                                    {getRelationExplanation(rel)}
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

                {/* Footer with Metadata */}
                {metadata && Object.keys(metadata).length > 0 && (
                    <div className="px-4 py-2 border-t border-white/5 text-[10px] text-white/30 flex items-center gap-4">
                        {metadata.size && <span>Size: {(metadata.size / 1024).toFixed(1)} KB</span>}
                        {metadata.tags && Array.isArray(metadata.tags) && <span>Tags: {metadata.tags.join(', ')}</span>}
                        {nodeId && <span className="font-mono">ID: {nodeId.slice(0, 8)}...</span>}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
};

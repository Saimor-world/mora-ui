'use client';

/**
 * MailApp - Guided Agency
 *
 * Gmail inbox display (transient, no persistence).
 * "Send to MORA" triggers action proposal.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { toast } from 'sonner';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { normalizeList } from '@/lib/api/http';
import { useNavStore } from '@/lib/store/navStore';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { Mail, Send, Inbox, Archive, RefreshCw, Loader2, ArrowLeft, Paperclip, X, Sparkles, PenSquare, Globe, Wrench } from 'lucide-react';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';
import type { AppProps } from '@/lib/apps/types';

interface MailAttachment {
    filename: string;
    content_type: string;
    size: number;
}

interface MailObject {
    id: string;
    message_id?: string;
    from_addr: string;
    subject: string;
    date: string;
    snippet: string;
    body_text?: string;
    has_html: boolean;
    attachments: MailAttachment[];
    attachment_count: number;
}

export default function MailApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const isActive = usePaneStore((state) => state.activePaneId === paneId);
    const { activeCompanyId } = useNavStore();
    const queryClient = useQueryClient();
    const pane = getPane(paneId);
    const { overview, browserBridge, summary } = useCommunicationSurface();
    const { mailPreview } = useCommunicationLiveData();

    const [mails, setMails] = useState<MailObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingMail, setViewingMail] = useState<MailObject | null>(null); // For viewer overlay
    const [composing, setComposing] = useState(false);
    const [composeTo, setComposeTo] = useState("");
    const [composeSubject, setComposeSubject] = useState("");
    const [composeBody, setComposeBody] = useState("");
    const [sending, setSending] = useState(false);

    const [proposing, setProposing] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    // For notification logic
    const prevCountRef = useRef<number>(0);
    const initializedRef = useRef(false);

    const fetchMails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await coreGet('/v3/mail/messages');
            const fetchedMails = normalizeList<MailObject>(response, ['messages', 'emails', 'mail', 'items', 'data']);
            setMails(fetchedMails);

            // Notification Logic
            if (initializedRef.current && fetchedMails.length > prevCountRef.current) {
                const newCount = fetchedMails.length - prevCountRef.current;
                toast.success(`${newCount} neue Nachricht${newCount > 1 ? 'en' : ''}`, {
                    description: fetchedMails[0].subject
                });
            }
            prevCountRef.current = fetchedMails.length;
            initializedRef.current = true;
            broadcastCommunicationSync('mail-fetch');

        } catch (err: any) {
            console.error("Failed to load mail:", err);
            setError(err.message || "Verbindung zum Mailserver fehlgeschlagen");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMails();
    }, [fetchMails]);

    const saveMail = async (mail: MailObject) => {
        setSaving(mail.id);
        try {
            await corePost('/v3/mail/commit', {
                message_id: mail.message_id || mail.id,
                mail_id: mail.id,
                subject: mail.subject,
                from_addr: mail.from_addr,
                received_at: mail.date,
                snippet: mail.snippet
            });

            broadcastCommunicationSync('mail-commit');
            toast.success("In Mycelium gespeichert");
        } catch (err) {
            console.error("Save failed", err);
            toast.error("Speichern fehlgeschlagen");
        } finally {
            setSaving(null);
        }
    };

    const sendToMora = async (mail: MailObject) => {
        setProposing(true);

        try {
            const result = await corePost('/v3/mail/commit', {
                message_id: mail.message_id || mail.id,
                mail_id: mail.id,
                subject: mail.subject,
                from_addr: mail.from_addr,
                received_at: mail.date,
                snippet: mail.snippet
            });

            toast.success("An Mora gesendet", {
                description: result.space_name
                    ? `Eingeordnet in ${result.space_name}`
                    : "Von Mora eingeordnet"
            });

            if (activeCompanyId) {
                await queryClient.invalidateQueries({ queryKey: queryKeys.tree(activeCompanyId) });
            }

            broadcastCommunicationSync('mail-to-mora');

        } catch (err) {
            console.error('[MailApp] Commit error:', err);
            setError(String(err));
            toast.error("Senden fehlgeschlagen");
        } finally {
            setProposing(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    if (!pane) return null;

    const openBrowserConnect = () => {
        openPane({
            id: 'browser-connect',
            type: 'browser',
            title: 'Browser',
            size: { width: 1160, height: 760 },
            data: { initialUrl: 'about:saimor-connect' },
        });
    };

    const openIntegrations = () => {
        openPane({
            id: 'integrations-main',
            type: 'integrations',
            title: 'Integrationen',
            size: { width: 980, height: 740 },
        });
    };

    const latestMail = mailPreview[0] ?? null;
    const mailRequiredFields = Array.isArray(overview?.setup?.mail?.required_fields) ? overview.setup.mail.required_fields : [];
    const showMailSetupHint = !summary.mailConfigured;

    return (
        <GlassPanel
            title="Post"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showBackButton={!!viewingMail}
            onBack={() => setViewingMail(null)}
            draggable
            resizable
        >
            <div className="flex flex-col h-full relative">
                {!viewingMail && !composing && (
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Posteingang</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setComposing(true)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                title="Neue Nachricht"
                            >
                                <PenSquare className="w-4 h-4" />
                            </button>
                            <button
                                onClick={fetchMails}
                                disabled={loading}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                                title="Aktualisieren"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                )}

                {!viewingMail && !composing && (
                    <div className="border-b border-white/6 px-4 py-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Konten & Kommunikation</div>
                                    <div className="mt-1 text-sm text-white">
                                        {summary.mailStatusLabel}
                                    </div>
                                    <div className="mt-1 text-xs text-white/50">
                                        {summary.browserPermission === 'granted'
                                            ? 'Browser ist freigegeben und kann Signale, Mail und Kalender mittragen.'
                                            : 'Browser-Freigaben und Mail-Verbindung lassen sich direkt aus dem OS heraus vorbereiten.'}
                                    </div>
                                    {latestMail ? (
                                        <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Neueste Nachricht</div>
                                            <div className="mt-1 text-xs text-white/82">{latestMail.subject}</div>
                                            <div className="mt-1 truncate text-[11px] text-white/48">{latestMail.from}</div>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/55">
                                    {summary.mailConfigured ? 'Verbunden' : 'Vorbereitung'}
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={openBrowserConnect}
                                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/18 bg-cyan-500/[0.10] px-3 py-2 text-xs text-cyan-100 transition-colors hover:bg-cyan-500/[0.18]"
                                >
                                    <Globe size={14} />
                                    Browser verbinden
                                </button>
                                <button
                                    type="button"
                                    onClick={openIntegrations}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08]"
                                >
                                    <Wrench size={14} />
                                    Integrationen
                                </button>
                            </div>
                            {showMailSetupHint ? (
                                <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/[0.08] px-3 py-3">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/75">Mail-Setup</div>
                                    <div className="mt-1 text-xs leading-relaxed text-amber-50/88">
                                        {summary.mailStatusDetail}
                                    </div>
                                    {mailRequiredFields.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {mailRequiredFields.map((field) => (
                                                <span
                                                    key={field}
                                                    className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/55"
                                                >
                                                    {field}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Mail List */}
                <div className="flex-1 overflow-y-auto">
                    {loading && !viewingMail && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin w-8 h-8 text-emerald-500" />
                        </div>
                    )}

                    {error && !loading && !viewingMail && (
                        <div className="p-8 text-center">
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={fetchMails}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-all"
                            >
                                Erneut versuchen
                            </button>
                        </div>
                    )}

                    {!loading && !error && mails.length === 0 && !viewingMail && (
                        <div className="p-8 text-center text-white/40">
                            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm">
                                {summary.mailConfigured ? 'Keine Nachrichten im Posteingang' : summary.mailStatusLabel}
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-white/35">
                                {summary.mailConfigured
                                    ? 'Das verbundene Postfach ist leer oder hat aktuell keine sichtbaren Nachrichten.'
                                    : summary.mailStatusDetail}
                            </p>
                        </div>
                    )}

                    {!loading && !viewingMail && mails.map((mail) => (
                        <div
                            key={mail.id}
                            onClick={() => setViewingMail(mail)}
                            className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group flex items-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-xs font-bold shrink-0">
                                {mail.from_addr.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-white/90 font-medium truncate">
                                        {mail.from_addr.split('<')[0].trim()}
                                    </span>
                                    <span className="text-white/30 text-[10px] whitespace-nowrap pt-1">
                                        {formatDate(mail.date)}
                                    </span>
                                </div>
                                        <p className="text-white/70 text-sm truncate mb-1">{mail.subject || '(Kein Betreff)'}</p>
                                <p className="text-white/40 text-xs line-clamp-1">{mail.snippet}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Viewer Overlay */}
                <AnimatePresence>
                    {viewingMail && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-md flex flex-col z-20"
                        >
                            <div className="flex items-center gap-3 p-4 border-b border-white/10">
                                <button
                                    onClick={() => setViewingMail(null)}
                                    className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate text-sm">{viewingMail.subject || '(Kein Betreff)'}</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{viewingMail.from_addr.split('<')[0].trim()}</p>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <h2 className="text-xl text-white font-light mb-6 leading-tight">{viewingMail.subject}</h2>

                                <div className="flex items-center gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                                        {viewingMail.from_addr.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{viewingMail.from_addr}</p>
                                        <p className="text-white/30 text-xs">{formatDate(viewingMail.date)}</p>
                                    </div>
                                </div>

                                <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-light">
                                    {viewingMail.body_text || viewingMail.snippet}
                                </div>

                                {viewingMail.attachment_count > 0 && (
                                    <div className="mt-8 pt-8 border-t border-white/5">
                                        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-4">Anhänge ({viewingMail.attachment_count})</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {viewingMail.attachments?.map((at, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-default">
                                                    <Paperclip className="w-4 h-4 text-white/40" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white/80 text-xs truncate">{at.filename}</p>
                                                        <p className="text-white/20 text-[10px] uppercase">{(at.size / 1024).toFixed(1)} KB - {at.content_type.split('/')[1]}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Bar */}
                            <div className="p-6 border-t border-white/10 flex gap-4 bg-black/40 backdrop-blur-xl">
                                <button
                                    onClick={() => saveMail(viewingMail)}
                                    disabled={saving === viewingMail.id}
                                    className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all border border-white/5 flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    {saving === viewingMail.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                                    ) : (
                                        <Archive className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                    )}
                                    In Mycelium archivieren
                                </button>

                                <button
                                    onClick={() => sendToMora(viewingMail)}
                                    disabled={proposing}
                                    className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {proposing ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-black/50" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                    An Mora senden
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Compose Overlay */}
                <AnimatePresence>
                    {composing && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute inset-0 bg-[#0a0a0a] z-30 flex flex-col"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h3 className="text-sm font-medium text-white">Neue Nachricht</h3>
                                <button onClick={() => setComposing(false)} className="text-white/50 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 p-4 space-y-4">
                                <input
                                    type="email"
                                    placeholder="An"
                                    value={composeTo}
                                    onChange={(e) => setComposeTo(e.target.value)}
                                    className="w-full bg-transparent border-b border-white/10 p-2 text-white outline-none focus:border-emerald-500/50"
                                />
                                <input
                                    type="text"
                                    placeholder="Betreff"
                                    value={composeSubject}
                                    onChange={(e) => setComposeSubject(e.target.value)}
                                    className="w-full bg-transparent border-b border-white/10 p-2 text-white outline-none focus:border-emerald-500/50 font-medium"
                                />
                                <textarea
                                    placeholder="Nachricht ..."
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    className="w-full h-full bg-transparent p-2 text-white outline-none resize-none font-light leading-relaxed"
                                />
                            </div>
                            <div className="p-4 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={async () => {
                                        setSending(true);
                                        try {
                                            await corePost('/v3/mail/send', {
                                                to_email: composeTo,
                                                subject: composeSubject,
                                                content: composeBody,
                                                text_content: composeBody
                                            });
                                            broadcastCommunicationSync('mail-send');
                                            toast.success("Gesendet");
                                            setComposing(false);
                                            setComposeTo("");
                                            setComposeSubject("");
                                            setComposeBody("");
                                        } catch (e) {
                                            toast.error("Senden fehlgeschlagen");
                                        } finally {
                                            setSending(false);
                                        }
                                    }}
                                    disabled={!composeTo || !composeBody || sending}
                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Senden
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </GlassPanel>
    );
}

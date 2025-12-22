'use client';

/**
 * MailPane — Guided Agency Day 1
 * 
 * Gmail inbox display (transient, no persistence).
 * "Send to MÔRA" triggers action proposal.
 * 
 * FIXED: Proper pane store integration for draggable/minimizable
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { executeProposal } from '@/lib/agency/actionRegistry';
import type { ActionProposal } from '@/lib/agency/actionRegistry';
import { toast } from 'sonner';

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8000';

interface MailAttachment {
    filename: string;
    content_type: string;
    size: number;
}

interface MailObject {
    id: string;
    message_id?: string;
    subject: string;
    from_addr: string;
    to_addr?: string;
    date: string;
    snippet: string;
    body_text?: string;
    has_html: boolean;
    attachments: MailAttachment[];
    attachment_count: number;
}

interface MailPaneProps {
    id?: string;
}

export function MailPane({ id = 'mail-main' }: MailPaneProps) {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    const [mails, setMails] = useState<MailObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMail, setSelectedMail] = useState<MailObject | null>(null); // For proposal state
    const [viewingMail, setViewingMail] = useState<MailObject | null>(null); // For viewer overlay
    const [proposing, setProposing] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [currentProposal, setCurrentProposal] = useState<ActionProposal | null>(null);

    // For notification logic
    const prevCountRef = useRef<number>(0);
    const initializedRef = useRef(false);

    // Fetch mails from Gmail endpoint
    const fetchMails = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('saimor_token') || localStorage.getItem('saimor_dev_token') || '';
            const response = await fetch(`${API_BASE}/v1/integrations/gmail/messages?limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch mails: ${response.status}`);
            }

            const data = await response.json();
            setMails(data);

            // Notification Logic
            if (initializedRef.current && data.length > prevCountRef.current) {
                const newCount = data.length - prevCountRef.current;
                toast.success(`${newCount} New Mail${newCount > 1 ? 's' : ''}`, {
                    description: data[0].subject
                });
            }
            prevCountRef.current = data.length;
            initializedRef.current = true;

        } catch (err) {
            setError(String(err));
            console.error('[MailPane] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMails();
    }, [fetchMails]);

    // Save mail (Commit explicitly)
    const saveMail = async (mail: MailObject) => {
        setSaving(mail.id);
        try {
            const token = localStorage.getItem('saimor_token') || localStorage.getItem('saimor_dev_token') || '';
            const response = await fetch(`${API_BASE}/v1/integrations/gmail/commit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mail_id: mail.id,
                    message_id: mail.message_id || `msg_id_${mail.id}`,
                    subject: mail.subject,
                    from_addr: mail.from_addr,
                    snippet: mail.snippet,
                    received_at: mail.date
                })
            });

            if (!response.ok) throw new Error('Failed to save mail');

            toast.success("Mail Saved", { description: "Stored as Node in System Mail" });

        } catch (err) {
            console.error("Save failed", err);
            toast.error("Save Failed");
        } finally {
            setSaving(null);
        }
    };

    // Send mail to MÔRA for analysis
    const sendToMora = async (mail: MailObject) => {
        setProposing(true);
        setSelectedMail(mail);

        try {
            const token = localStorage.getItem('saimor_token') || localStorage.getItem('saimor_dev_token') || '';
            const response = await fetch(`${API_BASE}/v1/agency/propose`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mail_id: mail.id,
                    message_id: mail.message_id || `msg_id_${mail.id}`, // Fallback for causality
                    subject: mail.subject,
                    from_addr: mail.from_addr,
                    snippet: mail.snippet,
                    body_text: mail.body_text
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to get proposal: ${response.status}`);
            }

            const data = await response.json();
            const proposal: ActionProposal = data.proposal;
            setCurrentProposal(proposal);

            toast.success("Sent to MÔRA", { description: "Event & Node persisted" });

            // Execute the proposal (triggers cursor movement, highlights, etc.)
            await executeProposal(proposal);

        } catch (err) {
            console.error('[MailPane] Proposal error:', err);
            setError(String(err));
            toast.error("Failed to send to MÔRA");
        } finally {
            setProposing(false);
        }
    };

    // Format date for display
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

    return (
        <GlassPanel
            title="Gmail"
            width={500}
            height={600}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showBackButton={!!viewingMail}
            onBack={() => setViewingMail(null)}
            draggable
        >
            <div className="flex flex-col h-full relative">
                {/* Header Actions */}
                {!viewingMail && (
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-white/50">Inbox</p>
                            </div>
                        </div>

                        <button
                            onClick={fetchMails}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Mail List */}
                <div className="flex-1 overflow-y-auto">
                    {loading && !viewingMail && (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                        </div>
                    )}

                    {error && !loading && !viewingMail && (
                        <div className="p-4 text-center">
                            <p className="text-red-400 text-sm mb-2">Connection Error</p>
                            <button
                                onClick={fetchMails}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && mails.length === 0 && !viewingMail && (
                        <div className="p-4 text-center text-white/50">
                            <p>No new mails</p>
                        </div>
                    )}

                    {!loading && !viewingMail && mails.map((mail) => (
                        <div
                            key={mail.id}
                            onClick={() => setViewingMail(mail)}
                            className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-white/90 font-medium truncate flex-1 pr-2">
                                    {mail.from_addr.split('<')[0].trim()}
                                </span>
                                <span className="text-white/40 text-xs whitespace-nowrap">
                                    {formatDate(mail.date)}
                                </span>
                            </div>
                            <p className="text-white/80 text-sm truncate mb-1">{mail.subject || '(No Subject)'}</p>
                            <p className="text-white/50 text-xs line-clamp-2">{mail.snippet}</p>
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
                                    className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-white/60"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h3 className="text-white font-medium truncat">Mail Details</h3>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <h2 className="text-xl text-white font-light mb-4">{viewingMail.subject}</h2>

                                <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-medium">
                                        {viewingMail.from_addr.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{viewingMail.from_addr}</p>
                                        <p className="text-white/40 text-xs">{formatDate(viewingMail.date)}</p>
                                    </div>
                                </div>

                                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                    {viewingMail.body_text || viewingMail.snippet}
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="p-4 border-t border-white/10 flex gap-3 bg-black/40">
                                <button
                                    onClick={() => saveMail(viewingMail)}
                                    disabled={saving === viewingMail.id}
                                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving === viewingMail.id ? (
                                        <div className="w-4 h-4 animate-spin border-2 border-white/50 border-t-transparent rounded-full" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                    )}
                                    Save
                                </button>

                                <button
                                    onClick={() => sendToMora(viewingMail)}
                                    disabled={proposing}
                                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {proposing ? (
                                        <div className="w-4 h-4 animate-spin border-2 border-black/50 border-t-transparent rounded-full" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" />
                                        </svg>
                                    )}
                                    Send to MÔRA
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MÔRA Proposal Display (Global) */}
                <AnimatePresence>
                    {currentProposal && !viewingMail && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/10 overflow-hidden bg-emerald-900/10"
                        >
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">MÔRA Active</span>
                                </div>
                                <p className="text-white/80 text-sm">{currentProposal.summary}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </GlassPanel>
    );
}

export default MailPane;

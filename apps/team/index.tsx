'use client';

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Loader2, Plus, Send, User, Users } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { useSessionStore } from '@/lib/store/sessionStore';
import { getUserColorHex } from '@/lib/utils/userColors';
import { PlasmaOrb } from '@/components/mora/PlasmaOrb';
import { IdentityMedallion } from '@/components/os/shell/IdentityMedallion';
import { realtime as realtimeClient } from '@/lib/api/realtimeClient';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { AppProps } from '@/lib/apps/types';
import { GLASS_SHEET_PRESENTATION } from '@/lib/os/glassSheet';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'online' | 'offline';
    aura_color?: string;
    is_self?: boolean;
    last_seen?: string;
}

interface RoomMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_aura: string;
    content: string;
    created_at: string;
}

type Tab = 'room' | 'members' | 'invite';

// ─── Constants ────────────────────────────────────────────────────────────────

const OWNER_AURA = '#d4af37';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeIdentity = (v?: string | null) => (v || '').trim().toLowerCase();
const sameIdentity = (a?: string | null, b?: string | null) => {
    const na = normalizeIdentity(a);
    const nb = normalizeIdentity(b);
    return Boolean(na && nb && na === nb);
};
const isOwnerRole = (role?: string | null) =>
    role === 'owner' || role === 'system_owner';

function getAura(member: TeamMember, currentRole?: string): string {
    if (member.is_self) {
        return isOwnerRole(currentRole) ? OWNER_AURA : getUserColorHex(member.email || member.id);
    }
    if (isOwnerRole(member.role)) return OWNER_AURA;
    return member.aura_color || getUserColorHex(member.email || member.id);
}

/**
 * Deterministic scatter position for an orb, based on member id hash.
 * Returns x/y as percentage strings safe to use in style.left/top.
 */
function memberPosition(
    id: string,
    total: number,
    index: number,
): { x: number; y: number } {
    const hash = id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
    const cols = Math.ceil(Math.sqrt(total));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rows = Math.ceil(total / cols);
    const jitterX = (((hash >>> 8) & 0xff) / 255) * 20 - 10;
    const jitterY = (((hash >>> 16) & 0xff) / 255) * 20 - 10;
    const x = 15 + (cols > 1 ? (col / (cols - 1)) * 70 : 35) + jitterX;
    const y = 20 + (rows > 1 ? (row / (rows - 1)) * 50 : 25) + jitterY;
    return {
        x: Math.max(10, Math.min(90, x)),
        y: Math.max(10, Math.min(72, y)),
    };
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const TeamApp: React.FC<AppProps> = ({ paneId }) => {
    const { getPane, removePane, minimizePane, focusPane, updatePanePosition, updatePaneSize } =
        usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(state => state.activePaneId === paneId);
    const user = useSessionStore(state => state.user);
    const isOperational =
        (user as any)?.operational_state === 'operational' ||
        (user as any)?.setup_required === false;

    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<Tab>('room');

    // ── Members ──
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Room chat ──
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    // ── Invite ──
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
    const [isInviting, setIsInviting] = useState(false);

    // ─── Current user identity ─────────────────────────────────────────────

    const currentUser = user as any;
    const currentUserId: string | null =
        currentUser?.id || currentUser?.user_id || currentUser?.uid || null;
    const currentUserEmail: string | null = currentUser?.email || null;
    const currentUserName: string | null =
        currentUser?.name || currentUser?.full_name || null;

    // ─── Load members ──────────────────────────────────────────────────────

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await coreGet('/v3/team/members?include_inactive=false', {
                isOptional: true,
            });
            const raw: TeamMember[] = Array.isArray(res) ? res : [];

            const mapped: TeamMember[] = raw.map((u: any) => {
                const email: string = u.email || '';
                const name: string =
                    u.name || u.full_name || (email ? email.split('@')[0] : 'User');
                const role: string = u.role || 'member';
                const isSelf =
                    sameIdentity(u.id, currentUserId) ||
                    sameIdentity(u.user_id, currentUserId) ||
                    sameIdentity(email, currentUserEmail) ||
                    (!email && isOwnerRole(role) && isOwnerRole(currentUser?.role));
                const member: TeamMember = {
                    id: u.id,
                    name,
                    email,
                    role,
                    status: u.status === 'online' ? 'online' : 'offline',
                    is_self: isSelf,
                    aura_color: isSelf || isOwnerRole(role) ? OWNER_AURA : (u.aura_color || getUserColorHex(email || name)),
                    last_seen: u.last_seen,
                };
                return member;
            });

            // Self-fallback: add current user if not in API response
            const selfPresent = mapped.some(
                m =>
                    sameIdentity(m.id, currentUserId) ||
                    sameIdentity(m.email, currentUserEmail) ||
                    sameIdentity(m.name, currentUserName),
            );
            if (currentUser && !selfPresent) {
                const fallbackName =
                    currentUserName ||
                    (currentUserEmail ? currentUserEmail.split('@')[0] : 'Ich');
                mapped.unshift({
                    id: currentUserId || currentUserEmail || 'current-user',
                    name: fallbackName,
                    email: currentUserEmail || '',
                    role: currentUser.role || 'member',
                    status: 'online',
                    is_self: true,
                    aura_color: isOwnerRole(currentUser.role)
                        ? OWNER_AURA
                        : getUserColorHex(currentUserEmail || fallbackName),
                });
            }

            setMembers(mapped);
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId, currentUserEmail, currentUserName, currentUser]);

    // ─── Load room messages ─────────────────────────────────────────────────

    const fetchMessages = useCallback(async () => {
        const res = await coreGet('/v3/team/room/messages', { isOptional: true });
        if (Array.isArray(res)) {
            setMessages(res as RoomMessage[]);
        }
    }, []);

    // ─── Initial load ───────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOperational) return;
        fetchMembers();
        fetchMessages();
    }, [fetchMembers, fetchMessages, isOperational]);

    // ─── Auto-scroll on new message ────────────────────────────────────────

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ─── Real-time listener ────────────────────────────────────────────────

    useEffect(() => {
        const handler = (payload: RoomMessage) => {
            setMessages(prev => {
                // Deduplicate by id
                if (prev.some(m => m.id === payload.id)) return prev;
                return [...prev, payload];
            });
        };
        realtimeClient.on('chat.room_message', handler);
        return () => {
            realtimeClient.off('chat.room_message', handler);
        };
    }, []);

    // ─── Send room message ──────────────────────────────────────────────────

    const sendMessage = async () => {
        const content = chatInput.trim();
        if (!content || isSending) return;
        setChatInput('');
        setIsSending(true);
        // Optimistic local message
        const tempId = `temp-${Date.now()}`;
        const selfMember = members.find(m => m.is_self);
        const optimistic: RoomMessage = {
            id: tempId,
            sender_id: currentUserId || 'me',
            sender_name: selfMember?.name || currentUserName || 'Ich',
            sender_aura: selfMember?.aura_color || getAura({ id: tempId, name: '', email: currentUserEmail || '', role: currentUser?.role || 'member', status: 'online', is_self: true }, currentUser?.role),
            content,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        try {
            const res = await corePost('/v3/team/room/messages', { content });
            if (res && res.id) {
                // Replace optimistic entry with real one
                setMessages(prev =>
                    prev.map(m => (m.id === tempId ? (res as RoomMessage) : m)),
                );
            }
        } catch {
            toast.error('Nachricht konnte nicht gesendet werden.');
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
        }
    };

    // ─── Invite ─────────────────────────────────────────────────────────────

    const handleInvite = async () => {
        if (!inviteEmail.trim() || isInviting) return;
        setIsInviting(true);
        try {
            const res = await corePost('/v3/team/invite', {
                email: inviteEmail.trim(),
                role: inviteRole,
            });
            if (res?.success) {
                toast.success(`Einladung an ${inviteEmail.trim()} erstellt`);
                setInviteEmail('');
                setActiveTab('members');
            } else {
                toast.error('Einladung fehlgeschlagen');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Einladung fehlgeschlagen');
        } finally {
            setIsInviting(false);
        }
    };

    // ─── Room member positions ──────────────────────────────────────────────

    const roomLayout = useMemo(() => {
        const sorted = [...members].sort((a, b) => {
            if (a.is_self && !b.is_self) return -1;
            if (!a.is_self && b.is_self) return 1;
            if (isOwnerRole(a.role) && !isOwnerRole(b.role)) return -1;
            if (!isOwnerRole(a.role) && isOwnerRole(b.role)) return 1;
            return a.name.localeCompare(b.name);
        });
        const total = sorted.length;
        return sorted.map((member, index) => {
            const pos = total === 1
                ? { x: 50, y: 40 }
                : memberPosition(member.id, total, index);
            const delay = index * 0.3;
            const size = member.is_self ? 110 : isOwnerRole(member.role) ? 96 : 80;
            return { member, pos, delay, size };
        });
    }, [members]);

    // ─── Self lookup for chat rendering ────────────────────────────────────

    const isSelfMessage = useCallback(
        (msg: RoomMessage) =>
            sameIdentity(msg.sender_id, currentUserId) ||
            sameIdentity(msg.sender_id, currentUserEmail),
        [currentUserId, currentUserEmail],
    );

    if (!pane) return null;

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <GlassPanel
            title="Teamraum"
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
            draggable
            resizable
            paneId={paneId}
            {...GLASS_SHEET_PRESENTATION}
        >
            <div className="flex h-full flex-col">
                {/* ── Tab bar ── */}
                <div className="flex items-center gap-1 border-b border-white/5 p-2">
                    <button
                        onClick={() => setActiveTab('room')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'room' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <Users size={14} /> Raum
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'members' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <User size={14} /> Mitglieder
                    </button>
                    <button
                        onClick={() => setActiveTab('invite')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'invite' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <Plus size={14} /> Einladen
                    </button>
                </div>

                {/* ── Content area ── */}
                <div className="flex-1 overflow-hidden">
                    {/* ════════════════════════════════════════ ROOM TAB ═══ */}
                    {activeTab === 'room' && (
                        <div className="flex h-full flex-col">
                            {/* Orb canvas — takes most of the height */}
                            <div
                                className="relative flex-1 overflow-hidden"
                                style={{
                                    background:
                                        'radial-gradient(ellipse at 50% 40%, rgba(15,118,110,0.22) 0%, transparent 55%), radial-gradient(ellipse at 20% 15%, rgba(52,211,153,0.10) 0%, transparent 45%), radial-gradient(ellipse at 80% 10%, rgba(56,189,248,0.09) 0%, transparent 45%), linear-gradient(180deg, #000c0c 0%, #000405 100%)',
                                }}
                            >
                                {/* Ambient dots */}
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-30"
                                    style={{
                                        backgroundImage: `radial-gradient(circle at 14% 26%, rgba(255,255,255,0.22) 0 1px, transparent 2px), radial-gradient(circle at 72% 18%, rgba(52,211,153,0.20) 0 1px, transparent 2px), radial-gradient(circle at 48% 76%, rgba(125,211,252,0.18) 0 1px, transparent 2px)`,
                                        backgroundSize: '120px 120px, 180px 180px, 150px 150px',
                                    }}
                                />

                                {/* Empty state */}
                                {!isLoading && members.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-sm text-white/30">
                                        Noch niemand hier.
                                    </div>
                                )}

                                {/* Loading state */}
                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-white/30" size={24} />
                                    </div>
                                )}

                                {/* Orbs */}
                                <AnimatePresence>
                                    {!isLoading &&
                                        roomLayout.map(({ member, pos, delay, size }) => {
                                            const aura = getAura(member, currentUser?.role);
                                            const isOffline = member.status === 'offline';
                                            return (
                                                <motion.div
                                                    key={member.id}
                                                    initial={{ opacity: 0, scale: 0.6 }}
                                                    animate={{
                                                        opacity: isOffline ? 0.45 : 1,
                                                        scale: 1,
                                                        y: [0, member.is_self ? -6 : -10, 0],
                                                    }}
                                                    transition={{
                                                        opacity: { duration: 0.5, delay },
                                                        scale: { duration: 0.5, delay },
                                                        y: {
                                                            duration: 4 + (delay % 3),
                                                            repeat: Infinity,
                                                            ease: 'easeInOut',
                                                            delay: delay * 0.8,
                                                        },
                                                    }}
                                                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
                                                    style={{
                                                        left: `${pos.x}%`,
                                                        top: `${pos.y}%`,
                                                    }}
                                                >
                                                    <div className="relative flex items-center justify-center">
                                                        {/* Aura glow */}
                                                        <div
                                                            className="pointer-events-none absolute inset-[-40%] rounded-full blur-2xl"
                                                            style={{
                                                                background: `radial-gradient(circle, ${aura}30, transparent 68%)`,
                                                            }}
                                                        />

                                                        {member.is_self || isOwnerRole(member.role) ? (
                                                            <IdentityMedallion
                                                                name={member.name}
                                                                role={member.role}
                                                                size={size}
                                                                preferInitials
                                                            />
                                                        ) : (
                                                            <PlasmaOrb
                                                                color={aura}
                                                                state={isOffline ? 'focus' : 'idle'}
                                                                size={size}
                                                            />
                                                        )}

                                                        {/* Online dot */}
                                                        {member.status === 'online' && (
                                                            <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                                        )}
                                                    </div>

                                                    {/* Name label */}
                                                    <div className="text-center">
                                                        <div
                                                            className="text-xs font-medium text-white/90"
                                                            style={{ textShadow: `0 0 12px ${aura}60` }}
                                                        >
                                                            {member.is_self ? 'Du' : member.name}
                                                        </div>
                                                        <div className="text-[9px] uppercase tracking-widest text-white/35">
                                                            {member.role}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                </AnimatePresence>
                            </div>

                            {/* ── Group chat strip ── */}
                            <div className="flex h-48 flex-col border-t border-white/[0.06] bg-black/30">
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                                    {messages.length === 0 && (
                                        <div className="flex h-full items-center justify-center text-[11px] text-white/25 italic">
                                            Noch keine Nachrichten im Teamraum.
                                        </div>
                                    )}
                                    {messages.map(msg => {
                                        const self = isSelfMessage(msg);
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex items-start gap-2 ${self ? 'flex-row-reverse' : ''}`}
                                            >
                                                {/* Aura dot */}
                                                <div
                                                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                                    style={{ background: msg.sender_aura || '#ffffff44' }}
                                                />
                                                <div className={`flex flex-col gap-0.5 ${self ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span
                                                            className="text-[10px] font-medium"
                                                            style={{ color: msg.sender_aura || 'rgba(255,255,255,0.6)' }}
                                                        >
                                                            {self ? 'Du' : msg.sender_name}
                                                        </span>
                                                        <span className="text-[9px] text-white/25">
                                                            {formatTime(msg.created_at)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`max-w-[220px] rounded-xl px-3 py-1.5 text-xs text-white/85 ${self ? 'bg-white/10' : 'bg-white/[0.05] border border-white/[0.06]'}`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatBottomRef} />
                                </div>

                                {/* Input */}
                                <div className="border-t border-white/[0.04] p-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Schreib in den Teamraum…"
                                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-white/20"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={!chatInput.trim() || isSending}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-30"
                                        >
                                            <Send size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════ MEMBERS TAB ═══ */}
                    {activeTab === 'members' && (
                        <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
                            {isLoading ? (
                                <div className="flex h-full items-center justify-center text-white/30">
                                    <Loader2 className="animate-spin" size={22} />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/30 italic">
                                    Noch keine Mitglieder.
                                </div>
                            ) : (
                                members.map(member => {
                                    const aura = getAura(member, currentUser?.role);
                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Aura dot */}
                                                <div
                                                    className="h-7 w-7 shrink-0 rounded-full border border-white/10 flex items-center justify-center"
                                                    style={{
                                                        background: `radial-gradient(circle, ${aura}55, ${aura}22)`,
                                                        boxShadow: member.status === 'online' ? `0 0 12px ${aura}55` : 'none',
                                                    }}
                                                >
                                                    <div
                                                        className="h-3 w-3 rounded-full"
                                                        style={{ background: aura }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">
                                                        {member.is_self ? `${member.name} (Du)` : member.name}
                                                    </div>
                                                    <div className="text-[10px] text-white/35">{member.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                                                    {member.role}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className={`h-1.5 w-1.5 rounded-full ${member.status === 'online' ? 'bg-emerald-400' : 'bg-white/20'}`}
                                                    />
                                                    <span className="text-[10px] capitalize text-white/30">
                                                        {member.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ════════════════════════════════════ INVITE TAB ════ */}
                    {activeTab === 'invite' && (
                        <div className="flex h-full flex-col items-center justify-center p-6">
                            <div className="w-full max-w-sm space-y-6 text-center">
                                <div className="space-y-1">
                                    <h3 className="text-base font-medium text-white">
                                        Neues Mitglied einladen
                                    </h3>
                                    <p className="text-xs text-white/35">
                                        Lade Kollegen in dein Team ein.
                                    </p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-white/30">
                                            E-Mail Adresse
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="kollege@firma.de"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-white/30">
                                            Rolle
                                        </label>
                                        <select
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                                            value={inviteRole}
                                            onChange={e =>
                                                setInviteRole(e.target.value as 'member' | 'admin')
                                            }
                                        >
                                            <option value="member">Mitglied</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={handleInvite}
                                    disabled={!inviteEmail.trim() || isInviting}
                                    className="w-full rounded-xl bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                                >
                                    {isInviting ? 'Wird gesendet…' : 'Einladung senden'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};

export default TeamApp;

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bell, MessageSquare, Send, User, Users, Search, Filter, Mail, Shield, Plus, MoreVertical, Loader2, Sparkles } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost, corePatch } from '@/lib/api/coreClient';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { getUserColorHex } from '@/lib/utils/userColors';
import { PlasmaOrb } from '@/components/mora/PlasmaOrb';
import { IdentityMedallion } from '@/components/os/shell/IdentityMedallion';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { AppProps } from '@/lib/apps/types';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    aura_color?: string;
    is_self?: boolean;
}
interface ChatRoom {
    id: string;
    name: string;
    type: 'direct' | 'group';
    last_message?: string;
}

interface TeamActivity {
    id: string;
    type: 'message' | 'join' | 'action';
    actor_name: string;
    content: string;
    timestamp: string;
}

const OWNER_AURA_HEX = '#d4af37';
const normalizeIdentity = (value?: string | null) => (value || '').trim().toLowerCase();
const isOwnerRole = (role?: string | null) => role === 'owner' || role === 'system_owner';
const sameIdentity = (left?: string | null, right?: string | null) => {
    const a = normalizeIdentity(left);
    const b = normalizeIdentity(right);
    return Boolean(a && b && a === b);
};

export const TeamApp: React.FC<AppProps> = ({ paneId }) => {
    const { getPane, removePane, minimizePane, focusPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(state => state.activePaneId === paneId);
    const user = useSessionStore(state => state.user); 
    const isOperational = user?.operational_state === 'operational' || user?.setup_required === false;

    const [activeTab, setActiveTab] = useState<'members' | 'chat' | 'activity' | 'invite' | 'room'>('members');    const [members, setMembers] = useState<TeamMember[]>([]);
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activities, setActivities] = useState<TeamActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [roomMessage, setRoomMessage] = useState("");
    const [roomHistory, setRoomHistory] = useState<TeamActivity[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchTeamData = useCallback(async () => {
        try {
            const [membersV3Res, activityRes] = await Promise.all([
                coreGet("/v3/team/members?include_inactive=false", { isOptional: true }),
                coreGet("/v3/team/activity?limit=20", { isOptional: true })
            ]);
            
            const membersRes = Array.isArray(membersV3Res) ? membersV3Res : [];
            const currentUser = user as any;
            const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.uid || null;
            const currentUserEmail = currentUser?.email || null;
            const currentUserName = currentUser?.name || currentUser?.full_name || null;
            const realMembers: TeamMember[] = membersRes.map((u: any) => {
                const email: string = u.email || '';
                const name: string = u.name || u.full_name || (email ? email.split('@')[0] : 'User');
                const role: string = u.role || 'member';
                const isSelf = sameIdentity(u.id, currentUserId)
                    || sameIdentity(u.user_id, currentUserId)
                    || sameIdentity(email, currentUserEmail)
                    || (!email && isOwnerRole(role) && isOwnerRole(currentUser?.role));
                return {
                    id: u.id,
                    name,
                    email,
                    role,
                    status: u.status || (u.is_online ? 'online' : 'offline'),
                    // Self and owner identity must match the dock medallion.
                    is_self: isSelf,
                    aura_color: isSelf || isOwnerRole(role) ? OWNER_AURA_HEX : (u.aura_color || getUserColorHex(email || name)),
                };
            });

            if (currentUser && !realMembers.some((member) =>
                sameIdentity(member.id, currentUserId) ||
                sameIdentity(member.email, currentUserEmail) ||
                sameIdentity(member.name, currentUserName)
            )) {
                const fallbackName = currentUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Ich');
                realMembers.unshift({
                    id: currentUserId || currentUserEmail || 'current-user',
                    name: fallbackName,
                    email: currentUserEmail || '',
                    role: currentUser.role || 'member',
                    status: 'online',
                    is_self: true,
                    aura_color: isOwnerRole(currentUser.role) ? OWNER_AURA_HEX : getUserColorHex(currentUserEmail || fallbackName),
                });
            }

            setMembers(realMembers);
            if (activityRes) setActivities(activityRes);
            
            // Auto-select first member for chat if none selected
            if (realMembers.length > 0 && !selectedRoomId) {
                setSelectedRoomId(realMembers[0].id);
            }
        } catch (error) {
            console.error("Failed to load team data", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedRoomId, user]);

    const fetchHistory = useCallback(async () => {
        if (!selectedRoomId || activeTab !== "chat") return;
        try {
            const history = await coreGet(`/v3/team/messages/${selectedRoomId}`, { isOptional: true });
            if (Array.isArray(history)) {
                setRoomHistory(history.map((m: any) => ({
                    id: m.id || `msg-${Math.random()}`,
                    type: "message",
                    actor_name: m.sender_name || (m.sender_id === selectedRoomId ? "Team" : "Ich"),
                    content: m.content,
                    timestamp: m.timestamp || m.created_at || new Date().toISOString()
                })));
            }
        } catch (e) {
            console.error("Failed to fetch message history", e);
        }
    }, [selectedRoomId, activeTab]);

    useEffect(() => {
        if (!isOperational) return;
        fetchTeamData();
    }, [fetchTeamData, isOperational]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const sendMessage = async () => {
        if (!roomMessage.trim() || !selectedRoomId) return;

        const trimmed = roomMessage.trim();
        setRoomMessage("");

        const tempId = `temp-${Date.now()}`;
        const newMessage: TeamActivity = {
            id: tempId,
            type: "message",
            actor_name: "Ich",
            content: trimmed,
            timestamp: new Date().toISOString()
        };

        setRoomHistory(prev => [...prev, newMessage]);

        try {
            await corePost("/v3/team/message", { 
                recipient_id: selectedRoomId, 
                content: trimmed,
                channel_type: "direct"
            });
        } catch (e) {
            console.error("Failed to send team message", e);
            setRoomHistory(prev => prev.filter(m => m.id !== tempId));
            toast.error("Nachricht konnte nicht gesendet werden.");
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        try {
            const res = await corePost("/v3/team/invite", { email: inviteEmail, role: inviteRole });
            if (res?.success) {
                toast.success(`Einladung an ${inviteEmail} erstellt`);
                setInviteEmail("");
                setActiveTab("members");
            }
        } catch (error: any) {
            toast.error(error?.message || "Einladung fehlgeschlagen");
        }
    };

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return members;
        const q = searchQuery.toLowerCase();
        return members.filter(m => 
            m.name.toLowerCase().includes(q) || 
            m.email.toLowerCase().includes(q) || 
            m.role.toLowerCase().includes(q)
        );
    }, [members, searchQuery]);

    const roomMembers = useMemo(() => {
        const ordered = [...members].sort((a, b) => {
            if (a.is_self && !b.is_self) return -1;
            if (!a.is_self && b.is_self) return 1;
            if (isOwnerRole(a.role) && !isOwnerRole(b.role)) return -1;
            if (!isOwnerRole(a.role) && isOwnerRole(b.role)) return 1;
            return a.name.localeCompare(b.name);
        });

        const orbitMembers = ordered.filter((member) => !member.is_self);
        const orbitTotal = Math.max(1, orbitMembers.length);
        const orbitPositions = new Map<string, { x: number; y: number; size: number; delay: number }>();

        orbitMembers.forEach((member, index) => {
            const angle = (-Math.PI / 2) + (index * (Math.PI * 2 / orbitTotal));
            const radiusX = orbitTotal <= 3 ? 24 : 32;
            const radiusY = orbitTotal <= 3 ? 20 : 24;
            orbitPositions.set(member.id, {
                x: 50 + Math.cos(angle) * radiusX,
                y: 52 + Math.sin(angle) * radiusY,
                size: isOwnerRole(member.role) ? 108 : 84,
                delay: index * 0.22,
            });
        });

        return ordered.map((member, index) => ({
            member,
            position: member.is_self
                ? { x: 50, y: 52, size: 122, delay: 0 }
                : orbitPositions.get(member.id) || { x: 50, y: 52, size: 84, delay: index * 0.2 },
        }));
    }, [members]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Team & Collaboration"
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
        >
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-1 border-b border-white/5 p-2">
                    <button
                        onClick={() => setActiveTab('members')}   
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'members' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <Users size={14} /> Mitglieder
                    </button>
                    <button
                        onClick={() => setActiveTab('room')}      
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'room' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <Sparkles size={14} /> Teamraum
                    </button>                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <MessageSquare size={14} /> Chat
                    </button>
                    <button 
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'activity' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <Activity size={14} /> Aktivität
                    </button>
                    <button 
                        onClick={() => setActiveTab('invite')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === 'invite' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                    >
                        <Plus size={14} /> Einladen
                    </button>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                    {activeTab === 'members' && (
                        <div className="flex h-full flex-col gap-4">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Mitglieder suchen..."
                                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-white/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {isLoading ? (
                                    <div className="flex h-full items-center justify-center text-white/30"><Loader2 className="animate-spin" /></div>
                                ) : filteredMembers.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/50 border border-white/5"
                                                style={{ boxShadow: member.status === 'online' ? `0 0 15px ${member.aura_color}44` : 'none' }}
                                            >
                                                <User size={20} style={{ color: member.aura_color }} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{member.name}</div>
                                                <div className="text-[10px] text-white/40">{member.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">{member.role}</div>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-1.5 w-1.5 rounded-full ${member.status === 'online' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                                <span className="text-[10px] text-white/30 capitalize">{member.status}</span>       
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'room' && (
                        <div className="relative h-full overflow-hidden rounded-[28px] border border-white/[0.07] bg-[radial-gradient(circle_at_50%_52%,rgba(15,118,110,0.20),transparent_30%),radial-gradient(circle_at_18%_18%,rgba(52,211,153,0.12),transparent_38%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,0.10),transparent_36%),linear-gradient(180deg,rgba(1,12,12,0.90),rgba(0,4,5,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_22px_70px_rgba(0,0,0,0.28)]">
                            <div className="absolute inset-0 opacity-35" style={{
                                backgroundImage: `
                                    radial-gradient(circle at 14% 26%, rgba(255,255,255,0.22) 0 1px, transparent 1.8px),
                                    radial-gradient(circle at 72% 18%, rgba(52,211,153,0.20) 0 1px, transparent 1.8px),
                                    radial-gradient(circle at 48% 76%, rgba(125,211,252,0.18) 0 1px, transparent 1.8px)
                                `,
                                backgroundSize: '120px 120px, 180px 180px, 150px 150px',
                            }} />
                            <div className="absolute inset-x-[8%] top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-200/18 to-transparent" />
                            <div className="absolute left-1/2 top-1/2 h-[44%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/[0.06]" />
                            <div className="absolute left-1/2 top-1/2 h-[68%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/[0.045]" />

                            <div className="absolute left-6 top-5 z-10">
                                <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/42">Teamraum</div>
                                <div className="mt-1 text-sm text-white/76">Deine Identitaet liegt im Zentrum. Teammitglieder bewegen sich darum.</div>
                            </div>

                            <div className="relative h-full">
                                <AnimatePresence>
                                    {roomMembers.map(({ member, position }, idx) => (
                                        <motion.div
                                            key={member.id}
                                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                            animate={{
                                                opacity: 1,
                                                scale: 1,
                                                y: [0, member.is_self ? -5 : -10, 0],
                                            }}
                                            transition={{
                                                duration: member.is_self ? 5.6 : 4 + (idx % 3),
                                                repeat: Infinity,
                                                delay: position.delay,
                                                ease: "easeInOut"
                                            }}
                                            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3"
                                            style={{
                                                left: `${position.x}%`,
                                                top: `${position.y}%`,
                                            }}
                                        >
                                            <div className="relative flex items-center justify-center">
                                                <div
                                                    className="absolute inset-[-34%] rounded-full blur-2xl"
                                                    style={{ background: `radial-gradient(circle, ${member.aura_color || '#10B981'}28, transparent 68%)` }}
                                                />
                                                {member.is_self || isOwnerRole(member.role) ? (
                                                    <IdentityMedallion
                                                        name={member.name}
                                                        role={member.role}
                                                        size={position.size}
                                                        preferInitials
                                                    />
                                                ) : (
                                                    <PlasmaOrb
                                                        color={member.aura_color || "#10B981"}
                                                        state={member.status === 'online' ? 'idle' : 'focus'}
                                                        size={position.size}
                                                    />
                                                )}
                                                {member.status === 'online' && (
                                                    <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <div className={`font-medium text-white ${member.is_self ? 'text-base' : 'text-sm'}`}>{member.is_self ? 'Du' : member.name}</div>
                                                <div className="text-[10px] uppercase tracking-widest text-white/40">{member.is_self ? `${member.name} - ${member.role}` : member.role}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-center text-[10px] text-white/34">
                                Auren sind identisch mit der Konto-Identitaet: Besitzer/Owner erscheinen als goldene Medaille, Mitglieder als stabile Teamfarben.
                            </div>
                        </div>
                    )}
                    {activeTab === 'chat' && (
                        <div className="flex h-full flex-col gap-4">
                            <div className="flex flex-1 overflow-hidden rounded-2xl border border-white/5 bg-black/20">
                                <div className="w-48 border-r border-white/5 overflow-y-auto bg-white/[0.02]">
                                    <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Kontakte</div>
                                    {members.map(member => (
                                        <button 
                                            key={member.id}
                                            onClick={() => setSelectedRoomId(member.id)}
                                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${selectedRoomId === member.id ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
                                        >
                                            <div className={`h-1.5 w-1.5 rounded-full ${member.status === 'online' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                            <span className="truncate">{member.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-1 flex-col">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {roomHistory.length === 0 ? (
                                            <div className="flex h-full items-center justify-center text-center text-white/20">
                                                <div className="space-y-2">
                                                    <MessageSquare className="mx-auto" size={24} />
                                                    <div className="text-xs">Keine Nachrichten vorhanden.<br/>Starte eine Konversation.</div>
                                                </div>
                                            </div>
                                        ) : roomHistory.map(msg => (
                                            <div key={msg.id} className={`flex flex-col ${msg.actor_name === 'Ich' ? 'items-end' : 'items-start'}`}>
                                                <div className="mb-1 text-[10px] text-white/30">{msg.actor_name} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.actor_name === 'Ich' ? 'bg-cyan-500/20 text-white border border-cyan-500/30' : 'bg-white/10 text-white/80 border border-white/5'}`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-white/5 p-3">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Nachricht schreiben..."
                                                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-4 pr-12 text-sm text-white outline-none focus:border-white/20"
                                                value={roomMessage}
                                                onChange={(e) => setRoomMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            />
                                            <button 
                                                onClick={sendMessage}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/10 p-2 text-white/50 transition-colors hover:bg-white/20 hover:text-white"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="flex h-full flex-col gap-4">
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {activities.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-white/20 text-xs italic">Keine aktuellen Aktivitäten vorhanden</div>
                                ) : activities.map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                                        <div className="mt-0.5 rounded-full bg-white/10 p-1.5 text-white/40">
                                            {activity.type === 'message' ? <MessageSquare size={14} /> : <Activity size={14} />}
                                        </div>
                                        <div>
                                            <div className="text-xs text-white/80"><span className="font-bold text-white">{activity.actor_name}</span> {activity.content}</div>
                                            <div className="mt-1 text-[10px] text-white/30">{new Date(activity.timestamp).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'invite' && (
                        <div className="flex h-full flex-col items-center justify-center">
                            <div className="w-full max-w-sm space-y-6 text-center">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-medium text-white">Neues Mitglied einladen</h3>
                                    <p className="text-xs text-white/40">Lade Kollegen in dein Team ein, um gemeinsam am Universum zu arbeiten.</p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-white/30">E-Mail Adresse</label>
                                        <input 
                                            type="email" 
                                            placeholder="kollege@firma.de"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white outline-none focus:border-white/20"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-white/30">Rolle</label>
                                        <select 
                                            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white outline-none focus:border-white/20"
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                        >
                                            <option value="member">Mitglied</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleInvite}
                                    className="w-full rounded-xl bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
                                >
                                    Einladung senden
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

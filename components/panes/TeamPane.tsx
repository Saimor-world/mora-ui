"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    UserPlus,
    MessageCircle,
    Activity,
    Circle,
    Send,
    Mail,
    Clock,
    Sparkles,
    ChevronRight,
    X,
    Search,
    Filter
} from "lucide-react";
import { coreGet, corePost } from "@/lib/api/coreClient";
import { buildChatContext } from "@/lib/api/moraAgentClient";
import { realtime } from "@/lib/api/realtimeClient";
import { toast } from "sonner";
import { usePaneStore } from "@/lib/store/paneStore";
import { useMoraStore } from "@/lib/store/moraState";
import { useMoraContext } from "@/lib/mora/useMoraContext";
import { dispatchMoraPresence } from "@/lib/mora/presenceEvents";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { isAdmin } from "@/lib/auth/roles";

interface ChatMessage {
    id: string;
    sender_id: string;
    sender_name?: string;
    recipient_id?: string;
    channel_id?: string;
    content: string;
    timestamp: string;
    read: boolean;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: "online" | "offline" | "away" | "busy";
    last_seen?: string;
}

interface TeamActivity {
    id: string;
    user_name: string;
    action: string;
    target_type: string;
    target_name: string;
    timestamp: string;
}

interface Props {
    id?: string;
    onClose?: () => void;
}

/**
 * TEAM PANE - Microsoft Teams-like Collaboration
 * 
 * Real-time team presence, messaging, and activity feed.
 * Connects to /v3/team/* endpoints.
 * Live presence, direct messages, and team activity feed.
 */
export const TeamPane: React.FC<Props> = ({ id = 'team-main', onClose }) => {
    // Pane management for close button
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore(state => state.activePaneId === id);
    const { user } = useMoraStore();
    const ctx = useMoraContext();

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [memberSource, setMemberSource] = useState<'v3' | 'v1' | 'none'>('none');
    const [activities, setActivities] = useState<TeamActivity[]>([]);
    const [activeTab, setActiveTab] = useState<"members" | "activity" | "invite" | "room">("members");
    const [isLoading, setIsLoading] = useState(true);
    const [showChat, setShowChat] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

    // Invitations
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [roomHistory, setRoomHistory] = useState<ChatMessage[]>([]);
    const [roomMessage, setRoomMessage] = useState("");
    const [isLoadingRoom, setIsLoadingRoom] = useState(false);
    const roomEndRef = useRef<HTMLDivElement>(null);

    const hasPromptedSetupRef = useRef(false);

    // Close handler
    const handleClose = () => {
        removePane(id);
        if (onClose) onClose();
    };

    // Prompt setup if not operational
    useEffect(() => {
        if (ctx.isOperational !== false) {
            hasPromptedSetupRef.current = false;
            return;
        }
        if (hasPromptedSetupRef.current) return;

        const timer = window.setTimeout(() => {
            dispatchMoraPresence({
                action: 'point',
                targetId: 'team-setup-settings',
                message: 'Hier Organisation einrichten',
                source: 'system',
                duration: 3200,
            });
            hasPromptedSetupRef.current = true;
        }, 1800);

        return () => window.clearTimeout(timer);
    }, [ctx.isOperational]);

    // Realtime connection is managed by useRealtime (MoraShell).
    // TeamPane only subscribes to events below — no connect() here.

    // Fetch Chat History & Subscribe
    useEffect(() => {
        // Operational gate — do not call user-chat endpoints unless workspace is set up
        if (ctx.isOperational !== true) {
            setChatHistory([]);
            return;
        }
        if (!showChat) {
            setChatHistory([]);
            return;
        }
        if (showChat === "mora") {
            setChatHistory([]);
            setIsLoadingChat(false);
            return;
        }

        setIsLoadingChat(true);
        // UPGRADE: Use new /user-chat/history endpoint
        coreGet(`/v3/user-chat/history?recipient_id=${showChat}`).then((msgs: ChatMessage[] | null) => {
            if (msgs) setChatHistory(msgs);
            setIsLoadingChat(false);
        });

        const handleRealtimeMessage = (data: ChatMessage) => {
            // Check if message belongs to current active conversation
            // (Either from them, OR sent by me to them)
            if (data.sender_id === showChat || data.recipient_id === showChat) {
                // Phase 8: MORA Voice Trigger
                // If message is from Mora (or system acting as Mora), trigger visual effect
                // Assuming "mora" or specific ID for AI. 
                // For demo/simulation: If sender_name is "Mora" or "System"
                if (data.sender_name === "Mora" || data.sender_name === "System") {
                    const event = new CustomEvent('mora:speak', {
                        detail: {
                            targetX: window.innerWidth / 2,
                            targetY: window.innerHeight / 2
                        }
                    });
                    window.dispatchEvent(event);
                }

                setChatHistory(prev => {
                    // Dedupe just in case
                    if (prev.some(m => m.id === data.id)) return prev;
                    return [...prev, data];
                });
            }
        };

        realtime.on('chat.message', handleRealtimeMessage);
        return () => realtime.off('chat.message', handleRealtimeMessage);
    }, [showChat, ctx.isOperational]);

    useEffect(() => {
        if (activeTab !== "room" || ctx.isOperational !== true) return;
        setIsLoadingRoom(true);
        coreGet("/v3/user-chat/history?channel_id=team-room", { isOptional: true }).then((msgs: ChatMessage[] | null) => {
            if (msgs) setRoomHistory(msgs);
            setIsLoadingRoom(false);
        });
    }, [activeTab, ctx.isOperational]);

    useEffect(() => {
        if (activeTab !== "room") return;

        const handleRoomMessage = (data: ChatMessage) => {
            if (data.channel_id !== "team-room") return;
            setRoomHistory(prev => {
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data];
            });
        };

        realtime.on("chat.message", handleRoomMessage);
        return () => realtime.off("chat.message", handleRoomMessage);
    }, [activeTab]);

    // Scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, showChat]);

    useEffect(() => {
        if (activeTab !== "room") return;
        if (roomEndRef.current) {
            roomEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [roomHistory, activeTab]);

    // Send Message
    const handleSendMessage = async () => {
        if (!message.trim() || !showChat) return;

        const tempId = crypto.randomUUID();
        const newMessage: ChatMessage = {
            id: tempId,
            sender_id: user?.id || 'self',
            sender_name: user?.name || 'Me',
            recipient_id: showChat,
            content: message,
            timestamp: new Date().toISOString(),
            read: false
        };

        setChatHistory(prev => [...prev, newMessage]);
        const sentMessage = message;
        setMessage("");

        const isMoraChat = showChat === "mora";
        if (isMoraChat) {
            try {
                const response = await corePost("/v3/chat", {
                    message: sentMessage,
                    context: buildChatContext({ session_id: "team_pane" })
                });
                if (response?.reply) {
                    const aiMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        sender_id: "mora",
                        sender_name: "MA'RA",
                        recipient_id: user?.id || "self",
                        content: response.reply,
                        timestamp: new Date().toISOString(),
                        read: false
                    };

                    setChatHistory(prev => [...prev, aiMessage]);
                }
            } catch (e) {
                console.error("MA'RA request failed", e);
                setChatHistory(prev => prev.filter(m => m.id !== tempId));
                toast.error("MA'RA konnte nicht erreicht werden.");
            }
            return;
        }

        try {
            await corePost("/v3/user-chat/send", {
                recipient_id: showChat,
                content: sentMessage
            });
        } catch (e) {
            console.error("Failed to send", e);
            setChatHistory(prev => prev.filter(m => m.id !== tempId));
            toast.error("Nachricht konnte nicht gesendet werden.");
        }
    };

    const handleSendRoomMessage = async () => {
        if (!roomMessage.trim()) return;

        const trimmed = roomMessage.trim();
        const tempRoomId = crypto.randomUUID();
        const newMessage: ChatMessage = {
            id: tempRoomId,
            sender_id: user?.id || "self",
            sender_name: user?.name || "Me",
            channel_id: "team-room",
            content: trimmed,
            timestamp: new Date().toISOString(),
            read: false
        };

        setRoomHistory(prev => [...prev, newMessage]);
        setRoomMessage("");

        try {
            await corePost("/v3/user-chat/send", {
                channel_id: "team-room",
                content: trimmed
            });
        } catch (e) {
            console.error("Failed to send room message", e);
            setRoomHistory(prev => prev.filter(m => m.id !== tempRoomId));
            toast.error("Nachricht konnte nicht gesendet werden.");
        }
    };



    // Fetch team data — real DB members only (no synthetic peers or AI bot)
    const fetchTeamData = useCallback(async () => {
        try {
            const [membersV3Res, activityRes] = await Promise.all([
                coreGet("/v3/team/members?include_inactive=false", { isOptional: true }),
                coreGet("/v3/team/activity?limit=10", { isOptional: true })
            ]);
            const membersRes = Array.isArray(membersV3Res) ? membersV3Res : [];
            setMemberSource(Array.isArray(membersV3Res) ? 'v3' : 'none');

            const realMembers: TeamMember[] = Array.isArray(membersRes)
                ? membersRes.map((u: any) => ({
                    id: u.id,
                    name: u.name || u.full_name || (u.email ? u.email.split("@")[0] : "User"),
                    email: u.email,
                    role: u.role,
                    status: u.status || (u.is_online ? "online" : "offline")
                }))
                : [];

            setMembers(realMembers);

            if (activityRes) setActivities(activityRes);
        } catch (error) {
            console.error("Failed to load team data", error);
            setMembers([]);
            setMemberSource('none');
        } finally {
            setIsLoading(false);
        }
    }, []);


    // Poll for updates — only when workspace is operational
    useEffect(() => {
        if (ctx.isOperational !== true) return;

        fetchTeamData();

        // Update presence every 30 seconds
        const presenceInterval = setInterval(() => {
            coreGet("/v3/team/presence", { isOptional: true });
        }, 30000);

        // Refresh members every minute
        const refreshInterval = setInterval(fetchTeamData, 60000);

        return () => {
            clearInterval(presenceInterval);
            clearInterval(refreshInterval);
        };
    }, [fetchTeamData, ctx.isOperational]);

    // Send invite
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        try {
            const res = await corePost("/v3/team/invite", {
                email: inviteEmail,
                role: inviteRole
            });

            if (res?.success) {
                toast.success(`Einladung an ${inviteEmail} erstellt`);
                setInviteEmail("");
                setActiveTab("members");
                if (res?.invite_code) {
                    toast.info(`Invite code: ${res.invite_code}`);
                }
            }
        } catch (error: any) {
            toast.error(error?.message || "Einladung fehlgeschlagen");
        }
    };



    // Status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case "online": return "bg-emerald-500";
            case "away": return "bg-amber-500";
            case "busy": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "online": return "Online";
            case "away": return "Abwesend";
            case "busy": return "Beschäftigt";
            default: return "Offline";
        }
    };

    if (!pane) return null;

    // Bootstrap guard: session not yet loaded — render nothing (no flash)
    if (ctx.isOperational === null) return null;

    return (
        <GlassPanel
            title="Team"
            paneId={id}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={handleClose}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="h-full flex flex-col bg-[#030806]/95 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h2 className="text-sm font-medium text-emerald-50">Team</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-emerald-400/60 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full tracking-widest uppercase">
                                    Live · Echtdaten
                                </span>
                                <span className="text-[10px] text-white/30">
                                    {members.filter(m => m.status === "online").length} aktiv
                                    {' · '}
                                    {members.length} gesamt
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2">
                        {isAdmin(user?.role) && (
                            <button
                                onClick={() => openPane({ id: 'users-main', type: 'users', title: 'Team & Users', size: { width: 980, height: 700 } })}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/12 border border-emerald-500/30 text-[10px] text-emerald-300 uppercase tracking-wider hover:bg-emerald-500/20 transition-all"
                            >
                                Admin Users
                            </button>
                        )}
                        <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
                            {[
                                { id: "members", icon: Users, label: "Team" },
                                { id: "room", icon: MessageCircle, label: "Raum" },
                                { id: "activity", icon: Activity, label: "Aktivitaet" },
                                { id: "invite", icon: UserPlus, label: "Einladen" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`p-2 rounded-md transition-all ${activeTab === tab.id
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "text-white/40 hover:text-white/70"
                                        }`}
                                    title={tab.label}
                                >
                                    <tab.icon size={14} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                        title="Schliessen"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content — gated on operational state */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!ctx.isOperational ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center h-full">
                            <p className="text-sm font-medium text-foreground/80">
                                Kein Kontext aktiv
                            </p>
                            <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                                Oeffne zuerst das Beispielsystem oder waehle einen Bereich, damit das Team sinnvoll erscheint.
                            </p>
                            <button
                                id="team-setup-settings"
                                data-agency-id="team-setup-settings"
                                onClick={() => openPane({ id: 'company_settings', type: 'settings', title: 'Einstellungen', size: { width: 800, height: 600 } })}
                                className="mt-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
                            >
                                Einstellungen öffnen
                            </button>
                        </div>
                    ) : (
                    <AnimatePresence mode="wait">
                        {/* Members Tab */}
                        {activeTab === "members" && (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-3"
                            >
                                {/* Search & Filter Bar */}
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Teammitglied suchen..."
                                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/20 border border-white/5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/30 transition-all"
                                        />
                                    </div>
                                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                                        <button
                                            onClick={() => setStatusFilter("all")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === "all" ? "bg-emerald-500 text-black" : "text-white/50 hover:text-white"}`}
                                        >
                                            Alle
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter("online")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === "online" ? "bg-emerald-500 text-black" : "text-white/50 hover:text-white"}`}
                                        >
                                            Online
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter("offline")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === "offline" ? "bg-emerald-500 text-black" : "text-white/50 hover:text-white"}`}
                                        >
                                            Offline
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
                                    <span className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        {members.filter(m => m.status === "online").length} Online
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                                        {members.filter(m => m.status === "offline").length} Offline
                                    </span>
                                    <span className="text-white/20">|</span>
                                    <span>{members.length} Mitglieder gesamt</span>
                                </div>

                                {isLoading ? (
                                    <div className="text-center text-emerald-500/50 py-8">
                                        <Sparkles className="w-6 h-6 mx-auto mb-2 animate-pulse" />
                                        <p className="text-xs">Lade Team...</p>
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="text-center text-emerald-500/50 py-8">
                                        <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm mb-2">Noch keine Teammitglieder</p>
                                        <button
                                            onClick={() => setActiveTab("invite")}
                                            className="text-xs text-emerald-400 hover:underline"
                                        >
                                            Jetzt einladen
                                        </button>
                                    </div>
                                ) : (
                                    members
                                        .filter(m => {
                                            // Search filter
                                            const matchesSearch = searchQuery === "" ||
                                                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                m.email.toLowerCase().includes(searchQuery.toLowerCase());
                                            // Status filter
                                            const matchesStatus = statusFilter === "all" ||
                                                (statusFilter === "online" && m.status === "online") ||
                                                (statusFilter === "offline" && m.status === "offline");
                                            return matchesSearch && matchesStatus;
                                        })
                                        .map(member => (
                                            <motion.div
                                                key={member.id}
                                                whileHover={{ x: 4 }}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all cursor-pointer group"
                                                onClick={() => setShowChat(showChat === member.id ? null : member.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar with status */}
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-mora-gold/20 flex items-center justify-center text-emerald-100 font-medium">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#030806] ${getStatusColor(member.status)}`} />
                                                    </div>

                                                    <div>
                                                        <div className="text-sm text-emerald-50 font-medium">{member.name}</div>
                                                        <div className="flex items-center gap-2 text-[10px] text-emerald-500/50">
                                                            <span className="uppercase">{member.role}</span>
                                                            <Circle size={3} className="fill-current" />
                                                            <span>{getStatusLabel(member.status)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-500/10 text-emerald-400 transition-all">
                                                    <MessageCircle size={16} />
                                                </button>
                                            </motion.div>
                                        ))
                                )}

                                {/* Quick Chat */}
                                <AnimatePresence>
                                    {showChat && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mt-2">
                                                {/* Messages Area */}
                                                <div className="h-64 overflow-y-auto mb-3 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                                                    {isLoadingChat ? (
                                                        <div className="flex h-full items-center justify-center text-emerald-500/30">
                                                            <Sparkles className="w-4 h-4 animate-spin" />
                                                        </div>
                                                    ) : chatHistory.length === 0 ? (
                                                        <div className="flex h-full items-center justify-center text-center text-xs text-emerald-500/30">
                                                            <p>Schreib eine Nachricht<br />um den Chat zu starten</p>
                                                        </div>
                                                    ) : (
                                                        chatHistory.map(msg => {
                                                            const isMe = msg.sender_id !== showChat; // If sender is NOT the person I'm chatting with, it's me
                                                            return (
                                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                    <div className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${isMe
                                                                        ? 'bg-emerald-500/20 text-emerald-50 rounded-tr-none'
                                                                        : 'bg-white/5 text-emerald-100/80 rounded-tl-none border border-white/5'
                                                                        }`}>
                                                                        {msg.content}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                    <div ref={messagesEndRef} />
                                                </div>

                                                {/* Input Area */}
                                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                    <input
                                                        type="text"
                                                        value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                                        placeholder="Nachricht schreiben..."
                                                        className="flex-1 bg-transparent text-sm text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSendMessage}
                                                        disabled={!message.trim()}
                                                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        <Send size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Room Tab */}
                        {activeTab === "room" && (
                            <motion.div
                                key="room"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-emerald-50 font-medium">Team Room</div>
                                        <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Shared channel</div>
                                    </div>
                                    <div className="text-[10px] text-emerald-500/40">
                                        {members.length} members
                                    </div>
                                </div>

                                <div className="h-72 overflow-y-auto mb-2 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                                    {isLoadingRoom ? (
                                        <div className="flex h-full items-center justify-center text-emerald-500/30">
                                            <Sparkles className="w-4 h-4 animate-spin" />
                                        </div>
                                    ) : roomHistory.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-center text-xs text-emerald-500/30">
                                            <p>Noch keine Nachrichten im Team Room</p>
                                        </div>
                                    ) : (
                                        roomHistory.map(msg => {
                                            const meId = user?.id || "self";
                                            const isMe = msg.sender_id === meId;
                                            const senderLabel = msg.sender_name || (msg.sender_id === "mora" ? "MA'RA" : "Team member");

                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                    <div className="max-w-[85%]">
                                                        {!isMe && (
                                                            <div className="text-[10px] text-emerald-500/60 mb-1">
                                                                {senderLabel}
                                                            </div>
                                                        )}
                                                        <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${isMe
                                                            ? "bg-emerald-500/20 text-emerald-50 rounded-tr-none"
                                                            : "bg-white/5 text-emerald-100/80 rounded-tl-none border border-white/5"
                                                            }`}>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={roomEndRef} />
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <input
                                        type="text"
                                        value={roomMessage}
                                        onChange={(e) => setRoomMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendRoomMessage()}
                                        placeholder="Nachricht an das Team senden..."
                                        className="flex-1 bg-transparent text-sm text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSendRoomMessage}
                                        disabled={!roomMessage.trim()}
                                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Activity Tab */}
                        {activeTab === "activity" && (
                            <motion.div
                                key="activity"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-3"
                            >
                                {activities.length === 0 ? (
                                    <div className="text-center text-emerald-500/50 py-8">
                                        <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Noch keine Aktivitäten</p>
                                    </div>
                                ) : (
                                    activities.map(activity => (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                                        >
                                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                                <Activity size={14} className="text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-emerald-100">
                                                    <span className="font-medium">{activity.user_name}</span>
                                                    {" "}
                                                    <span className="text-emerald-500/70">
                                                        {activity.action === "created" && "hat erstellt:"}
                                                        {activity.action === "updated" && "hat bearbeitet:"}
                                                        {activity.action === "deleted" && "hat gelöscht:"}
                                                        {!["created", "updated", "deleted"].includes(activity.action) && activity.action}
                                                    </span>
                                                    {" "}
                                                    <span className="text-mora-gold">{activity.target_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-emerald-500/40 mt-1">
                                                    <Clock size={10} />
                                                    {new Date(activity.timestamp).toLocaleString("de-DE", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        day: "2-digit",
                                                        month: "short"
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}

                        {/* Invite Tab */}
                        {activeTab === "invite" && (
                            <motion.div
                                key="invite"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <div className="text-center py-4">
                                    <UserPlus className="w-10 h-10 mx-auto mb-3 text-mora-gold/50" />
                                    <h3 className="text-lg font-light text-emerald-50">Teammitglied einladen</h3>
                                    <p className="text-xs text-emerald-500/50 mt-1">
                                        Laden Sie Kollegen in Ihre Organisation ein
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-emerald-500/60 uppercase tracking-wider mb-2">
                                            E-Mail-Adresse
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/30" />
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                placeholder="kollege@firma.de"
                                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/30"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-emerald-500/60 uppercase tracking-wider mb-2">
                                            Rolle
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: "member", label: "Mitglied", desc: "Standard-Zugriff" },
                                                { id: "admin", label: "Admin", desc: "Voller Zugriff" }
                                            ].map(role => (
                                                <button
                                                    key={role.id}
                                                    onClick={() => setInviteRole(role.id as any)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${inviteRole === role.id
                                                        ? "border-emerald-500/50 bg-emerald-500/10"
                                                        : "border-white/10 hover:border-emerald-500/30"
                                                        }`}
                                                >
                                                    <div className="text-sm text-emerald-50">{role.label}</div>
                                                    <div className="text-[10px] text-emerald-500/50">{role.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleInvite}
                                        disabled={!inviteEmail.trim()}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-500/20 to-mora-gold/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-emerald-100 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <UserPlus size={16} />
                                        Einladung senden
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};

export default TeamPane;

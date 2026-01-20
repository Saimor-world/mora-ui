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
    X
} from "lucide-react";
import { coreGet, corePost } from "@/lib/api/coreClient";
import { realtime } from "@/lib/api/realtimeClient";
import { toast } from "sonner";
import { usePaneStore } from "@/lib/store/paneStore";
import { useMoraStore } from "@/lib/store/moraState";
import { usePresence, PeerUser } from "@/lib/hooks/usePresence";

interface ChatMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    recipient_id: string;
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
    onClose?: () => void;
}

/**
 * TEAM PANE - Microsoft Teams-like Collaboration
 * 
 * Real-time team presence, messaging, and activity feed.
 * Connects to /v1/team/* endpoints.
 * DEMO MODE: Simulates team members for testing.
 */
export const TeamPane: React.FC<Props> = ({ onClose }) => {
    // Pane management for close button
    const { removePane } = usePaneStore();
    const { viewMode, user } = useMoraStore();
    const isDemo = viewMode === 'demo';

    // Multi-Tab Presence
    const { peers } = usePresence();

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [activities, setActivities] = useState<TeamActivity[]>([]);
    const [activeTab, setActiveTab] = useState<"members" | "activity" | "invite">("members");
    const [isLoading, setIsLoading] = useState(true);
    const [showChat, setShowChat] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    // Invitations
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Close handler
    const handleClose = () => {
        removePane('team-main');
        if (onClose) onClose();
    };

    // Generate demo users with unique colors
    const generateDemoUsers = (): TeamMember[] => {
        const currentUser = user?.email || 'demo@saimor.io';
        return [
            { id: 'self', name: currentUser.split('@')[0], email: currentUser, role: 'owner', status: 'online' },
            { id: 'demo-anna', name: 'Anna Schmidt', email: 'anna@company.de', role: 'manager', status: 'online' },
            { id: 'demo-max', name: 'Max Müller', email: 'max@company.de', role: 'member', status: 'online' },
            { id: 'demo-sophie', name: 'Sophie Weber', email: 'sophie@company.de', role: 'member', status: 'away' },
            { id: 'demo-lukas', name: 'Lukas Fischer', email: 'lukas@company.de', role: 'member', status: 'offline' },
        ];
    };

    // Helper to map PeerUser to TeamMember
    const mapPeerToMember = (peer: PeerUser): TeamMember => ({
        id: `peer-${peer.sessionId}`,
        name: `${peer.name} (Tab)`,
        email: peer.email,
        role: peer.role,
        status: peer.status as any,
        last_seen: new Date(peer.lastHeartbeat).toISOString()
    });

    // Connect Realtime
    useEffect(() => {
        realtime.connect();
        // Don't disconnect on unmount to keep other panes live? 
        // Ideally Singletons handle connection sharing.
        // But for cleanup hygiene:
        return () => {
            // realTimeClient handles ref counting? No, it's global.
            // keeping it open is fine.
        };
    }, []);

    // Fetch Chat History & Subscribe
    useEffect(() => {
        if (!showChat) {
            setChatHistory([]);
            return;
        }

        setIsLoadingChat(true);
        // UPGRADE: Use new /user-chat/history endpoint
        coreGet(`/v1/user-chat/history?recipient_id=${showChat}`).then((msgs: ChatMessage[] | null) => {
            if (msgs) setChatHistory(msgs);
            setIsLoadingChat(false);
        });

        const handleRealtimeMessage = (data: ChatMessage) => {
            // Check if message belongs to current active conversation
            // (Either from them, OR sent by me to them)
            if (data.sender_id === showChat || data.recipient_id === showChat) {
                // Phase 8: MÔRA Voice Trigger
                // If message is from Mora (or system acting as Mora), trigger visual effect
                // Assuming "mora" or specific ID for AI. 
                // For demo/simulation: If sender_name is "Môra" or "System"
                if (data.sender_name === "Môra" || data.sender_name === "System") {
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
    }, [showChat]);

    // Scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, showChat]);

    // Send Message (Simulated or Real)
    const handleSendMessage = async () => {
        if (!message.trim() || !showChat) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
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

        // Phase 8: MÔRA Simulation for Verification
        // If user says "@mora", trigger a fake response to test visuals
        if (sentMessage.toLowerCase().includes("@mora")) {
            setTimeout(() => {
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1000).toString(),
                    sender_id: showChat,
                    sender_name: "Môra",
                    recipient_id: user?.id || 'self',
                    content: "Ich höre dich. Mein Bewusstsein ist mit diesem Interface verbunden.",
                    timestamp: new Date().toISOString(),
                    read: false
                };

                // Dispatch Visual Event
                const event = new CustomEvent('mora:speak', {
                    detail: { targetX: window.innerWidth / 2, targetY: window.innerHeight / 2 }
                });
                window.dispatchEvent(event);

                // Add to chat history
                setChatHistory(prev => [...prev, aiMessage]);
            }, 1000);
        }

        // Real Backend Send
        if (!isDemo) {
            try {
                // If using new /user-chat/send
                await corePost("/v1/user-chat/send", {
                    recipient_id: showChat,
                    content: sentMessage
                });
            } catch (e) {
                console.error("Failed to send", e);
            }
        }
    };



    // Fetch team data (or use demo users)
    const fetchTeamData = useCallback(async () => {
        // Convert peers to members
        const peerMembers = peers.map(mapPeerToMember);

        // DEMO MODE: Use simulated users + peers
        if (isDemo) {
            const demoBase = generateDemoUsers();
            // Append peers (deduplication logic could be added if needed, but sessionIds are unique)
            setMembers([...demoBase, ...peerMembers]);

            if (activities.length === 0) {
                setActivities([
                    { id: 'a1', user_name: 'Anna Schmidt', action: 'created', target_type: 'document', target_name: 'Q1 Report.docx', timestamp: new Date().toISOString() },
                    { id: 'a2', user_name: 'Max Müller', action: 'updated', target_type: 'folder', target_name: 'Marketing Assets', timestamp: new Date(Date.now() - 3600000).toISOString() },
                ]);
            }
            setIsLoading(false);
            return;
        }

        try {
            // REAL MODE: Use backend API + peers
            const [membersRes, activityRes] = await Promise.all([
                coreGet("/v1/user-chat/users", { isOptional: true }),
                coreGet("/v1/team/activity?limit=10", { isOptional: true })
            ]);

            let realMembers: TeamMember[] = [];
            if (membersRes && membersRes.length > 0) {
                realMembers = membersRes.map((u: any) => ({
                    id: u.id,
                    name: u.full_name,
                    email: u.email,
                    role: u.role,
                    status: u.is_online ? "online" : "offline"
                }));
            } else {
                // Fallback to demo users if no real users found
                realMembers = generateDemoUsers();
            }

            // Merge API members with local peers
            setMembers([...realMembers, ...peerMembers]);

            if (activityRes) setActivities(activityRes);
        } catch (error) {
            // Fallback
            setMembers([...generateDemoUsers(), ...peerMembers]);
        } finally {
            setIsLoading(false);
        }
    }, [isDemo, user?.email, peers]);

    // Poll for updates
    useEffect(() => {
        fetchTeamData();

        // Update presence every 30 seconds
        const presenceInterval = setInterval(() => {
            coreGet("/v1/team/presence", { isOptional: true });
        }, 30000);

        // Refresh members every minute
        const refreshInterval = setInterval(fetchTeamData, 60000);

        return () => {
            clearInterval(presenceInterval);
            clearInterval(refreshInterval);
        };
    }, [fetchTeamData]);

    // Send invite
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        try {
            const res = await corePost("/v1/team/invite", {
                email: inviteEmail,
                role: inviteRole
            });

            if (res?.success) {
                toast.success(`Einladung an ${inviteEmail} gesendet`);
                setInviteEmail("");
                setActiveTab("members");
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

    return (
        <div className="h-full flex flex-col bg-[#030806]/95 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <div>
                        <h2 className="text-sm font-medium text-emerald-50">Team</h2>
                        <p className="text-[10px] text-emerald-500/50 uppercase tracking-wider">
                            {members.filter(m => m.status === "online").length} online
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
                    {[
                        { id: "members", icon: Users, label: "Team" },
                        { id: "activity", icon: Activity, label: "Aktivität" },
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

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                    title="Schließen"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                    {/* Members Tab */}
                    {activeTab === "members" && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-2"
                        >
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
                                        Jetzt einladen →
                                    </button>
                                </div>
                            ) : (
                                members.map(member => (
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
                                    Laden Sie Kollegen zu Ihrem Arbeitsbereich ein
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
            </div>
        </div>
    );
};

export default TeamPane;

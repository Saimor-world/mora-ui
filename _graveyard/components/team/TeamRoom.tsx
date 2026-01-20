"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMoraStore } from "@/lib/store/moraState";
import { useUser } from "@/lib/hooks/useUser";
import { X, Send, Users, Paperclip, MessageCircle } from "lucide-react";

interface TeamMember {
    id: string;
    email: string;
    role: string;
    color: string;
    isOnline: boolean;
    lastSeen?: Date;
}

interface TeamMessage {
    id: string;
    senderId: string;
    senderEmail: string;
    senderColor: string;
    content: string;
    timestamp: Date;
    isMora?: boolean;
}

interface TeamRoomProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * TEAM ROOM - Collaborative Space
 * 
 * A space where team members (as colored light beings) can:
 * - See who's online (colored orbs)
 * - Chat with each other
 * - Chat with MÔRA
 * - Share files via drag-and-drop
 * 
 * Each user has a unique color based on their email hash.
 */
export const TeamRoom: React.FC<TeamRoomProps> = ({ isOpen, onClose }) => {
    const { user } = useUser();
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    // Generate color from email (same algorithm as UserAvatar)
    const generateColor = (email: string): string => {
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = ((hash << 5) - hash) + email.charCodeAt(i);
            hash = hash & hash;
        }
        const hue = Math.abs(hash % 360);
        const saturation = 60 + (Math.abs(hash >> 8) % 20);
        const lightness = 50 + (Math.abs(hash >> 16) % 15);
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    // User's own color
    const myColor = useMemo(() => {
        return generateColor(user?.email || 'guest');
    }, [user?.email]);

    // Simulated team members (in production, this would come from WebSocket)
    useEffect(() => {
        if (!isOpen) return;

        // Mock team members for demo
        const mockMembers: TeamMember[] = [
            { id: '1', email: user?.email || 'you@company.com', role: 'owner', color: myColor, isOnline: true },
            { id: '2', email: 'anna@company.com', role: 'manager', color: generateColor('anna@company.com'), isOnline: true },
            { id: '3', email: 'max@company.com', role: 'member', color: generateColor('max@company.com'), isOnline: true },
            { id: '4', email: 'sophie@company.com', role: 'member', color: generateColor('sophie@company.com'), isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
        ];
        setTeamMembers(mockMembers);

        // Welcome message from MÔRA
        setMessages([{
            id: 'mora-welcome',
            senderId: 'mora',
            senderEmail: 'mora@saimor.io',
            senderColor: '#10B981',
            content: 'Willkommen im Team Room! Hier können Sie mit Ihrem Team und mir kommunizieren.',
            timestamp: new Date(),
            isMora: true
        }]);
    }, [isOpen, user?.email, myColor]);

    // Send message
    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMessage: TeamMessage = {
            id: `msg-${Date.now()}`,
            senderId: user?.user_id || 'me',
            senderEmail: user?.email || 'you@company.com',
            senderColor: myColor,
            content: inputText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText("");

        // MÔRA responds if message contains @mora or is a question
        if (inputText.toLowerCase().includes('@mora') || inputText.includes('?')) {
            setTimeout(() => {
                const moraResponse: TeamMessage = {
                    id: `mora-${Date.now()}`,
                    senderId: 'mora',
                    senderEmail: 'mora@saimor.io',
                    senderColor: '#10B981',
                    content: `Ich habe Ihre Nachricht erhalten. Wie kann ich dem Team helfen?`,
                    timestamp: new Date(),
                    isMora: true
                };
                setMessages(prev => [...prev, moraResponse]);
            }, 1500);
        }
    };

    // Light Being component for team members
    const LightBeing: React.FC<{ member: TeamMember; size?: number }> = ({ member, size = 40 }) => (
        <motion.div
            className="relative group cursor-pointer"
            whileHover={{ scale: 1.1 }}
            title={`${member.email} (${member.role})`}
        >
            {/* Glow */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, ${member.color}80 0%, transparent 70%)`,
                    filter: 'blur(8px)',
                    transform: 'scale(1.5)'
                }}
            />
            {/* Core */}
            <div
                className="relative rounded-full"
                style={{
                    width: size,
                    height: size,
                    background: `radial-gradient(circle at 35% 35%, ${member.color} 0%, ${member.color}80 60%, transparent 100%)`,
                    boxShadow: `0 0 20px ${member.color}60, inset -3px -3px 10px rgba(0,0,0,0.3)`,
                    opacity: member.isOnline ? 1 : 0.4
                }}
            >
                {/* Initial */}
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                    {member.email.charAt(0).toUpperCase()}
                </span>
                {/* Online indicator */}
                {member.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
                )}
            </div>
        </motion.div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    className="fixed right-0 top-0 bottom-0 w-96 z-50 bg-[#050d0a]/95 backdrop-blur-2xl border-l border-emerald-500/20 flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Users size={16} className="text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-white font-medium">Team Room</h2>
                                <p className="text-xs text-white/40">{teamMembers.filter(m => m.isOnline).length} online</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={18} className="text-white/60" />
                        </button>
                    </div>

                    {/* Team Members - Light Beings Row */}
                    <div className="p-4 border-b border-white/5">
                        <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">Team Mitglieder</p>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {teamMembers.map(member => (
                                <LightBeing key={member.id} member={member} />
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(message => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${message.isMora ? 'flex-row' : 'flex-row'}`}
                            >
                                {/* Sender Avatar */}
                                <div
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                    style={{
                                        background: `radial-gradient(circle at 35% 35%, ${message.senderColor} 0%, ${message.senderColor}60 100%)`,
                                        boxShadow: `0 0 10px ${message.senderColor}40`
                                    }}
                                >
                                    {message.isMora ? (
                                        <span className="w-full h-full flex items-center justify-center text-white text-xs">M</span>
                                    ) : (
                                        <span className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                            {message.senderEmail.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {/* Message Content */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium" style={{ color: message.senderColor }}>
                                            {message.isMora ? 'MÔRA' : message.senderEmail.split('@')[0]}
                                        </span>
                                        <span className="text-[10px] text-white/30">
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={`text-sm ${message.isMora ? 'text-emerald-200/90' : 'text-white/80'}`}>
                                        {message.content}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10">
                        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <Paperclip size={18} className="text-white/40" />
                            </button>
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Nachricht senden... (@mora für MÔRA)"
                                className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
                            />
                            <button
                                onClick={handleSend}
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"
                            >
                                <Send size={18} className="text-emerald-400" />
                            </button>
                        </div>
                        <p className="text-[10px] text-white/30 mt-2 text-center">
                            Tippe @mora um MÔRA zu erwähnen
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TeamRoom;

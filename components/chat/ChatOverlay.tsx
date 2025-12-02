"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { useChatStore, type Channel } from "@/lib/chat/chatStore";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const ChatOverlay: React.FC<Props> = ({ isOpen, onClose }) => {
    const { activeChannel, setChannel, messages, sendMessage } = useChatStore();
    const [draft, setDraft] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!draft.trim()) return;
        sendMessage(activeChannel, draft.trim());
        setDraft("");
    };

    if (!isOpen) return null;

    const channels: { id: Channel; label: string }[] = [
        { id: "team", label: "TEAM" },
        { id: "personal", label: "PERSONAL" },
        { id: "system", label: "MÔRA" },
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#050d0a]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-mora-gold" />
                        <div className="text-sm font-medium text-emerald-50">Môra Chat</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/5 text-emerald-400/70 hover:text-emerald-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    {channels.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setChannel(c.id)}
                            className={`flex-1 text-center py-2 text-xs tracking-[0.2em] uppercase border-b-2 transition-all ${
                                activeChannel === c.id
                                    ? "border-mora-gold text-mora-gold"
                                    : "border-transparent text-emerald-200/60 hover:text-emerald-100"
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Messages */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {(messages[activeChannel] || []).map((msg) => (
                            <div key={msg.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
                                <div className="flex justify-between text-emerald-400/70 text-[11px] mb-1">
                                    <span>{msg.author}</span>
                                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="text-emerald-50">{msg.text}</div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-white/5 flex items-center gap-2">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Type a message..."
                            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-emerald-50 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                            onClick={handleSend}
                            className="px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-50 flex items-center gap-2 hover:bg-emerald-600/30 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

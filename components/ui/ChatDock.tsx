"use client";

import React, { useState, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { OrganicInput } from '@/components/organic/OrganicInput';
import { MessageSquareText, X, Maximize2, Minimize2, Loader2, Radar } from 'lucide-react';
import { sendMessage, type AIMessage } from '@/lib/api/aiClient';
import { fetchNodes, fetchNodeRelations } from '@/lib/api/coreClient';
import { getFolderEvents, runScan, type MindloopEvent } from '@/lib/api/mindloopClient';
import type { CoreNode } from '@/lib/types/core';

export const ChatDock: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    // Sprint Tag 1-2: Mindloop-Synthesis State
    const [synthesis, setSynthesis] = useState<any>(null);
    // Sprint Tag 2: Folder Nodes State
    const [folderNodes, setFolderNodes] = useState<CoreNode[]>([]);
    // Sprint Tag 3: Folder Events State
    const [folderEvents, setFolderEvents] = useState<MindloopEvent[]>([]);
    // Sprint Tag 4: Relations State
    const [relations, setRelations] = useState<any[]>([]);
    const { activeDepartmentId, activeSpaceId, activeFolderId, activeNode } = useMoraStore();

    // Sprint Tag 1-2: Load Mindloop-Synthesis on mount
    useEffect(() => {
        async function loadSynthesis() {
            try {
                const coreUrl = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8081';
                const token = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT;

                const response = await fetch(`${coreUrl}/v1/mindloop/synthesis`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSynthesis(data);
                    console.log('Mindloop Synthesis loaded:', data);
                } else {
                    console.warn('Failed to load synthesis:', response.status);
                }
            } catch (error) {
                console.error('Error loading synthesis:', error);
            }
        }

        loadSynthesis();
        // Reload every 60 seconds
        const interval = setInterval(loadSynthesis, 60000);
        return () => clearInterval(interval);
    }, []);

    // Sprint Tag 2 & 3: Load Folder Nodes & Events when folder changes
    useEffect(() => {
        async function loadFolderData() {
            if (!activeFolderId) {
                setFolderNodes([]);
                setFolderEvents([]);
                return;
            }

            try {
                const [nodes, events] = await Promise.all([
                    fetchNodes(activeFolderId),
                    getFolderEvents(activeFolderId, 10)
                ]);
                setFolderNodes(nodes);
                setFolderEvents(events);
                console.log(`Loaded ${nodes.length} nodes and ${events.length} events for folder ${activeFolderId}`);
            } catch (error) {
                console.error('Error loading folder data:', error);
                setFolderNodes([]);
                setFolderEvents([]);
            }
        }

        loadFolderData();
    }, [activeFolderId]);

    // Sprint Tag 4: Load Relations when activeNode changes
    useEffect(() => {
        async function loadRelations() {
            if (!activeNode) {
                setRelations([]);
                return;
            }
            try {
                const rels = await fetchNodeRelations(activeNode.id);
                setRelations(rels);
            } catch (error) {
                console.error('Error loading relations:', error);
                setRelations([]);
            }
        }
        loadRelations();
    }, [activeNode]);

    const handleScan = async () => {
        if (!activeFolderId || isLoading) return;

        setIsLoading(true);
        try {
            // Add user message
            setMessages(prev => [...prev, { role: 'user', content: 'Running Intelligence Scan...' }]);

            // Run scan
            const result = await runScan(activeFolderId);

            // Reload data
            const [nodes, events] = await Promise.all([
                fetchNodes(activeFolderId),
                getFolderEvents(activeFolderId, 10)
            ]);
            setFolderNodes(nodes);
            setFolderEvents(events);

            // Add AI response
            const count = Array.isArray(result.generated_events) ? result.generated_events.length : 0;
            const response = `Scan complete. I've generated an Intelligence Report based on ${count} events.`;
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);

        } catch (error: any) {
            console.error('Scan failed:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: `Scan failed: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const getWelcomeMessage = () => {
        if (activeNode) return `I see you're looking at "${activeNode.title}". How can I assist with this ${activeNode.type}?`;
        if (activeFolderId) {
            const nodeCount = folderNodes.length;
            if (nodeCount === 0) return "This folder is empty. What would you like to create?";

            const reportCount = folderNodes.filter(n => n.metadata?.subtype === 'intel_report').length;
            const docCount = folderNodes.filter(n => n.type === 'document' && n.metadata?.subtype !== 'intel_report').length;
            const noteCount = folderNodes.filter(n => n.type === 'note').length;

            const parts = [];
            if (reportCount > 0) parts.push(`${reportCount} intel report${reportCount > 1 ? 's' : ''}`);
            if (docCount > 0) parts.push(`${docCount} document${docCount > 1 ? 's' : ''}`);
            if (noteCount > 0) parts.push(`${noteCount} note${noteCount > 1 ? 's' : ''}`);

            const other = nodeCount - docCount - noteCount - reportCount;
            if (other > 0) parts.push(`${other} other item${other > 1 ? 's' : ''}`);

            return `I see ${parts.join(', ')} in this folder. How can I help?`;
        }
        if (activeSpaceId) return "Welcome to this Space. What would you like to create?";
        return "I'm connected to the Core. How can I help you navigate the system today?";
    };

    // Minimized Pill
    if (!isOpen) {
        return (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel border border-white/10 bg-mora-forest/80 backdrop-blur-md hover:border-mora-gold/50 transition-all shadow-lg group"
                >
                    <div className="w-2 h-2 rounded-full bg-mora-gold animate-pulse" />
                    <span className="text-xs text-emerald-100/80 tracking-widest uppercase group-hover:text-white">Môra AI</span>
                </button>
            </div>
        );
    }

    // Open Dock
    return (
        <div
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-500 ease-out
        ${isExpanded ? 'w-[800px] h-[600px]' : 'w-[500px] h-[300px]'}
      `}
        >
            <div className="w-full h-full rounded-3xl glass-panel border border-white/10 bg-[#050f0a]/60 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="h-12 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-mora-gold" />
                        <span className="text-xs font-medium text-emerald-100 tracking-widest uppercase">Môra Assistant</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeFolderId && (
                            <button
                                onClick={handleScan}
                                className="p-1.5 rounded-full hover:bg-white/5 text-emerald-500/50 hover:text-mora-gold transition-colors"
                                title="Run Intelligence Scan"
                            >
                                <Radar size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-full hover:bg-white/5 text-emerald-500/50 hover:text-emerald-300 transition-colors"
                        >
                            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-full hover:bg-white/5 text-emerald-500/50 hover:text-red-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Context Bar */}
                <div className="px-6 py-2 border-b border-white/5 flex items-center gap-2 text-[10px] text-emerald-500/50 overflow-x-auto custom-scrollbar whitespace-nowrap">
                    <span>ROOT</span>
                    {activeDepartmentId && <><span>/</span><span className="text-emerald-400">DEPT</span></>}
                    {activeSpaceId && <><span>/</span><span className="text-emerald-400">SPACE</span></>}
                    {activeFolderId && <><span>/</span><span className="text-emerald-400">FOLDER</span></>}
                    {activeNode && <><span>/</span><span className="text-mora-gold truncate max-w-[150px]">{activeNode.title}</span></>}
                </div>

                {/* Chat Area */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                    {/* Welcome Message */}
                    {messages.length === 0 && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-mora-gold/10 border border-mora-gold/20 flex items-center justify-center shrink-0">
                                <span className="text-xs text-mora-gold">M</span>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Môra • Just now</div>
                                <p className="text-sm text-emerald-100/90 leading-relaxed">
                                    {getWelcomeMessage()}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Message History */}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-mora-gold/10 border border-mora-gold/20 flex items-center justify-center shrink-0">
                                    <span className="text-xs text-mora-gold">M</span>
                                </div>
                            )}
                            <div className={`flex-1 max-w-[80%] space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">
                                    {msg.role === 'user' ? 'You' : 'Môra'} • Just now
                                </div>
                                <div className={`text-sm leading-relaxed p-3 rounded-lg ${msg.role === 'user'
                                    ? 'bg-mora-gold/10 border border-mora-gold/20 text-emerald-100'
                                    : 'text-emerald-100/90'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-xs text-emerald-400">U</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-mora-gold/10 border border-mora-gold/20 flex items-center justify-center shrink-0">
                                <Loader2 size={14} className="text-mora-gold animate-spin" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Môra • Thinking...</div>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-mora-gold/50 animate-pulse" />
                                    <div className="w-2 h-2 rounded-full bg-mora-gold/50 animate-pulse delay-100" />
                                    <div className="w-2 h-2 rounded-full bg-mora-gold/50 animate-pulse delay-200" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/20 border-t border-white/5">
                    <OrganicInput
                        placeholder="Ask Môra..."
                        onSend={async (msg) => {
                            if (!msg.trim() || isLoading) return;

                            setIsLoading(true);

                            // Add user message
                            const userMessage: AIMessage = { role: 'user', content: msg };
                            setMessages(prev => [...prev, userMessage]);

                            try {
                                // Sprint Tag 2: Build context with Nodes + Mindloop-Synthesis
                                const context = {
                                    departmentId: activeDepartmentId || undefined,
                                    spaceId: activeSpaceId || undefined,
                                    folderId: activeFolderId || undefined,
                                    nodeId: activeNode?.id,
                                    nodeTitle: activeNode?.title,
                                    nodeType: activeNode?.type,
                                    folderNodes: folderNodes.map(n => ({
                                        title: n.title,
                                        type: n.type,
                                        id: n.id
                                    })),
                                    mindloopSynthesis: synthesis, // Include Synthesis
                                    mindloopEvents: folderEvents.map(e => ({
                                        type: e.event_type,
                                        timestamp: e.timestamp,
                                        summary: e.metadata ? JSON.stringify(e.metadata) : 'No details'
                                    })),
                                    relations: relations
                                };

                                // Send to AI
                                const reply = await sendMessage(msg, context, messages);

                                // Add AI reply
                                const assistantMessage: AIMessage = { role: 'assistant', content: reply };
                                setMessages(prev => [...prev, assistantMessage]);
                            } catch (error: any) {
                                console.error('AI Error:', error);
                                const errorMessage: AIMessage = {
                                    role: 'assistant',
                                    content: `Entschuldigung, ein Fehler ist aufgetreten: ${error.message || 'Unknown error'}`
                                };
                                setMessages(prev => [...prev, errorMessage]);
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                    />
                </div>

            </div>
        </div>
    );
};

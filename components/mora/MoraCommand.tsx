"use client";

import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { askMora, AgentAction } from '@/lib/api/agencyClient';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { toast } from '@/lib/toast';


interface MoraCommandProps {
    onSuccess?: () => void;
}

export function MoraCommand({ onSuccess }: MoraCommandProps) {
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);

    // Context accessors
    const viewLevel = useMoraStore(s => s.viewLevel);
    const activeNode = useMoraStore(s => s.activeNode);
    const setOrbState = useMoraStore(s => s.setOrbState);

    // Navigation actions
    const navigateToDepartment = useMoraStore(s => s.navigateToDepartment);
    const navigateToSpace = useMoraStore(s => s.navigateToSpace);
    const navigateToFolder = useMoraStore(s => s.navigateToFolder);
    const loadNodeDetails = useMoraStore(s => s.loadNodeDetails);

    // Pane actions for opening documents
    const addPane = usePaneStore(s => s.addPane);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || thinking) return;

        setThinking(true);
        setOrbState('thinking');
        const intent = input;
        setInput('');

        try {
            // 1. Gather Context
            const context = {
                view_level: viewLevel,
                active_node_id: activeNode?.id
            };

            // 2. Think (Backend Agency)
            const plan = await askMora(intent, context);

            // 3. Act
            await executePlan(plan);

            // 4. Success / Cleanup
            onSuccess?.();
            setOrbState('idle');

        } catch (err) {
            console.error(err);
            toast.error("I lost my train of thought.");
            setOrbState('alert');
            setTimeout(() => setOrbState('idle'), 3000);
        } finally {
            setThinking(false);
        }
    };

    const executePlan = async (plan: AgentAction) => {
        console.log("Executing Plan:", plan);

        if (plan.message) {
            toast.success(plan.message, { duration: 5000 });
        }

        switch (plan.action) {
            case 'open':
            case 'navigate':
                if (plan.target) {
                    // Start visual travel (Highlight the target)
                    // Visual travel trigger removed (controller simplified)

                    try {
                        // Heuristic Routing based on ID
                        if (plan.target.includes('dept') || plan.target.includes('department')) {
                            navigateToDepartment(plan.target);
                        } else if (plan.target.includes('space')) {
                            navigateToSpace(plan.target);
                        } else if (plan.target.includes('folder')) {
                            navigateToFolder(plan.target);
                        } else if (plan.target.includes('node')) {
                            // Link/Document opening
                            await loadNodeDetails(plan.target);

                            // Open Pane for visual confirmation
                            addPane({
                                id: `doc-${plan.target}`,
                                type: 'document',
                                title: 'Document',
                                position: { x: window.innerWidth / 4, y: 100 },
                                size: { width: 600, height: 700 },
                                minimized: false,
                                data: { nodeId: plan.target }
                            });
                        } else if (plan.target.includes('comp') || plan.target.includes('company')) {
                            // TODO: Company navigation
                        } else {
                            // Fallback warning
                            console.warn(`Target ${plan.target} navigation not uniquely mapped.`);
                        }
                    } catch (e) {
                        console.error("Navigation failed", e);
                        toast.warning("I found the location but couldn't go there.");
                    }
                }
                break;
            case 'explain':
                // Already handled by message toast
                break;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <div className={`
                absolute inset-0 rounded-full transition-opacity duration-500 pointer-events-none
                ${thinking ? 'opacity-100' : 'opacity-0'}
            `}
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent)',
                    animation: 'shimmer 2s infinite'
                }}
            />
            <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Môra..."
                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-light"
                disabled={thinking}
            />
            <button
                type="submit"
                className={`
                    absolute right-2 top-1/2 -translate-y-1/2 transition-colors
                    ${thinking ? 'text-emerald-400 animate-pulse' : 'text-white/40 hover:text-emerald-400'}
                `}
                disabled={thinking}
            >
                {thinking ? <Sparkles size={16} /> : <Send size={16} />}
            </button>
        </form>
    );
}

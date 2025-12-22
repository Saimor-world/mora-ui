"use client";

import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { askMora, AgentAction } from '@/lib/api/agencyClient';
import { useMoraStore } from '@/lib/store/moraState';
import { toast } from '@/lib/toast';
import { triggerMoraVisual } from '@/components/mora/MoraAICursorController';

export function MoraCommand() {
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);

    // Context accessors
    const viewLevel = useMoraStore(s => s.viewLevel);
    const activeNode = useMoraStore(s => s.activeNode);

    // Navigation actions
    const navigateToDepartment = useMoraStore(s => s.navigateToDepartment);
    const navigateToSpace = useMoraStore(s => s.navigateToSpace);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || thinking) return;

        setThinking(true);
        const intent = input;
        setInput('');

        try {
            // 1. Gather Context
            const context = {
                view_level: viewLevel,
                active_node_id: activeNode?.id
            };

            // 2. Think (Backend Agency)
            // toast.loading("Môra is thinking..."); // Using UI state instead of toast for cleaner feel
            const plan = await askMora(intent, context);

            // 3. Act
            await executePlan(plan);

        } catch (err) {
            console.error(err);
            toast.error("I lost my train of thought.");
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
            case 'navigate':
                if (plan.target) {
                    // Start visual travel
                    triggerMoraVisual(`#${plan.target}`, 2000);

                    // Simple heuristic for routing
                    if (plan.target.includes('dept') || plan.target.includes('department')) {
                        navigateToDepartment(plan.target);
                    } else if (plan.target.includes('space')) {
                        navigateToSpace(plan.target);
                    } else if (plan.target.includes('comp') || plan.target.includes('company')) {
                        // TODO: Implement navigateToCompany if needed
                    } else {
                        // Fallback generic info
                        console.warn(`Target ${plan.target} navigation not mapped yet.`);
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

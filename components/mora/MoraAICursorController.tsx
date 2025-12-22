'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CursorAgent } from './CursorAgent';
import { useMoraStore } from '@/lib/store/moraState';

export interface AIAction {
    type: 'navigate' | 'highlight' | 'click' | 'explain' | 'idle';
    target?: {
        selector?: string;
        id?: string;
        position?: { x: number; y: number };
        label?: string;
    };
    message?: string;
    duration?: number;
}

// Internal action type that maps to CursorAgent
type CursorAction = 'idle' | 'highlight' | 'point' | 'roam';

interface MoraAICursorControllerProps {
    /** Whether AI cursor control is enabled */
    enabled?: boolean;
    /** Callback when AI performs an action */
    onAction?: (action: AIAction) => void;
}

/**
 * MoraAICursorController - AI Controls the Cursor
 * 
 * This component allows Môra (the AI) to control the cursor/orb
 * to guide users, demonstrate features, or autonomously work.
 * 
 * Features:
 * - Receive commands from AI backend
 * - Execute navigation/highlight/click actions
 * - Show visual feedback
 * - Queue multiple actions
 */
export const MoraAICursorController: React.FC<MoraAICursorControllerProps> = ({
    enabled = true,
    onAction
}) => {
    const [isActive, setIsActive] = useState(false);
    const [currentAction, setCurrentAction] = useState<CursorAction>('idle');
    const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | undefined>();
    const [actionQueue, setActionQueue] = useState<AIAction[]>([]);
    const [awareness, setAwareness] = useState<'idle' | 'focus' | 'thinking'>('idle');

    // Find element position by selector or id
    const findElementPosition = useCallback((target: AIAction['target']): { x: number; y: number } | null => {
        if (!target) return null;

        if (target.position) {
            return target.position;
        }

        let element: Element | null = null;

        if (target.id) {
            element = document.getElementById(target.id);
        } else if (target.selector) {
            element = document.querySelector(target.selector);
        }

        if (element) {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }

        return null;
    }, []);

    // Execute a single AI action
    const executeAction = useCallback(async (action: AIAction) => {
        setAwareness('focus');
        setIsActive(true);

        const position = findElementPosition(action.target);

        switch (action.type) {
            case 'highlight':
                setCurrentAction('highlight');
                if (position) {
                    setTargetPosition(position);
                }
                break;

            case 'idle':
            default:
                setCurrentAction('idle');
                setIsActive(false);
        }

        onAction?.(action);

        // Reset after duration
        const duration = action.duration || 2000;
        await new Promise(r => setTimeout(r, duration));

        setAwareness('idle');
    }, [findElementPosition, onAction]);

    // Process action queue
    useEffect(() => {
        if (actionQueue.length > 0 && !isActive) {
            const nextAction = actionQueue[0];
            setActionQueue(prev => prev.slice(1));
            executeAction(nextAction);
        }
    }, [actionQueue, isActive, executeAction]);

    // Listen for AI commands (Visual Only)
    useEffect(() => {
        const handleAICommand = (event: CustomEvent<AIAction>) => {
            // Only allow visual actions
            if (['highlight', 'idle'].includes(event.detail.type)) {
                setActionQueue(prev => [...prev, event.detail]);
            }
        };

        window.addEventListener('mora-ai-action' as any, handleAICommand);
        return () => window.removeEventListener('mora-ai-action' as any, handleAICommand);
    }, []);

    // Expose API for programmatic control (Visual Only)
    useEffect(() => {
        // @ts-ignore - Expose globally for visual status
        window.moraAI = {
            highlight: (target: AIAction['target'], duration = 2000) => {
                const event = new CustomEvent('mora-ai-action', {
                    detail: { type: 'highlight', target, duration }
                });
                window.dispatchEvent(event);
            }
        };
    }, []);

    const handleActionComplete = useCallback((action: string) => {
        setIsActive(false);
    }, []);

    if (!enabled) return null;

    return (
        <CursorAgent
            active={isActive}
            action={currentAction}
            target={targetPosition}
            onActionComplete={handleActionComplete}
            speed={1.2}
            awareness={awareness}
        />
    );
};

// Helper: Visual Only
export const triggerMoraVisual = (targetSelector: string, duration = 2000) => {
    const event = new CustomEvent('mora-ai-action', {
        detail: {
            type: 'highlight',
            target: { selector: targetSelector },
            duration
        }
    });
    window.dispatchEvent(event);
};

export default MoraAICursorController;

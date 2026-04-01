/**
 * Mora Cursor Bridge - AI Controls the Cursor
 * 
 * This module allows AI responses to trigger cursor actions.
 * The AI can embed commands in its response which get parsed and executed.
 * 
 * Command Format (JSON in response):
 * ```
 * [[MORA_ACTION:{"type":"highlight","target":"#element-id","duration":2000}]]
 * ```
 */

import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';

export interface CursorCommand {
    type: 'highlight' | 'point' | 'navigate' | 'pulse' | 'idle' | 'pane';
    target?: string; // CSS selector or element ID
    position?: { x: number; y: number };
    duration?: number;
    message?: string;
    // Pane-specific fields
    action?: 'open' | 'close' | 'minimize';
    paneType?: 'finder' | 'document' | 'terminal' | 'settings' | 'mail' | 'calendar';
    data?: any;
}

/**
 * Parse AI response for embedded cursor commands
 */
export function parseAIResponse(content: string): {
    cleanContent: string;
    commands: CursorCommand[];
} {
    const commands: CursorCommand[] = [];
    let cleanContent = content;

    // Pattern: [[MORA_ACTION:{...}]]
    const actionPattern = /\[\[MORA_ACTION:(.*?)\]\]/g;
    let match;

    while ((match = actionPattern.exec(content)) !== null) {
        try {
            const command = JSON.parse(match[1]) as CursorCommand;
            commands.push(command);
        } catch (e) {
            console.warn('[CursorBridge] Failed to parse command:', match[1]);
        }
    }

    // Remove commands from content shown to user
    cleanContent = content.replace(actionPattern, '').trim();

    return { cleanContent, commands };
}

/**
 * Execute cursor commands via the global moraAI API
 */
export function executeCursorCommands(commands: CursorCommand[]): void {
    if (typeof window === 'undefined') return;

    const moraAI = (window as any).moraAI;
    const dispatchCursorAction = (type: 'highlight' | 'point', cmd: CursorCommand) => {
        dispatchMoraPresence({
            action: type,
            targetSelector: cmd.target,
            targetPosition: cmd.position,
            duration: cmd.duration,
            message: cmd.message,
            source: 'ai'
        });
    };

    commands.forEach((cmd, index) => {
        // Stagger commands with delay
        setTimeout(() => {
            switch (cmd.type) {
                case 'highlight':
                    dispatchCursorAction('highlight', cmd);
                    if (moraAI?.highlight) {
                        if (cmd.target) {
                            moraAI.highlight(
                                { selector: cmd.target },
                                cmd.duration || 2000
                            );
                        } else if (cmd.position) {
                            moraAI.highlight(
                                { position: cmd.position },
                                cmd.duration || 2000
                            );
                        }
                    }
                    break;

                case 'point':
                    // Point action - cursor flies to element
                    if (cmd.target || cmd.position) {
                        dispatchCursorAction('point', cmd);
                    }
                    break;

                case 'pulse':
                    // Pulse the orb
                    const pulseEvent = new CustomEvent('mora-orb-pulse', {
                        detail: { intensity: 'high', color: 'gold' }
                    });
                    window.dispatchEvent(pulseEvent);
                    break;

                case 'navigate':
                    if (cmd.target) {
                        dispatchMoraPresence({
                            action: 'navigate',
                            targetId: cmd.target,
                            message: cmd.message,
                            duration: cmd.duration,
                            source: 'ai'
                        });

                        const pulseEvent = new CustomEvent('mora-orb-pulse', {
                            detail: { intensity: 'low', color: 'emerald' }
                        });
                        window.dispatchEvent(pulseEvent);
                    }
                    break;

                case 'pane':
                    if (cmd.action === 'open' || !cmd.action) {
                        const paneEvent = new CustomEvent('mora-pane-action', {
                            detail: {
                                action: 'open',
                                type: cmd.paneType || 'finder',
                                data: cmd.data || {}
                            }
                        });
                        window.dispatchEvent(paneEvent);
                    }
                    break;

                default:
                    console.log('[CursorBridge] Unknown command:', cmd);
            }
        }, index * 500); // Stagger by 500ms
    });
}

/**
 * Helper: Suggest cursor action based on AI analysis
 */
export function suggestCursorAction(
    response: string,
    context: {
        departmentId?: string;
        folderId?: string;
        nodeId?: string;
    }
): CursorCommand | null {
    const lowerResponse = response.toLowerCase();

    // Auto-detect when AI is referring to specific elements
    if (lowerResponse.includes('hier') || lowerResponse.includes('dieser')) {
        // AI is pointing to current element
        if (context.nodeId) {
            return {
                type: 'highlight',
                target: `[data-node-id="${context.nodeId}"]`,
                duration: 2000
            };
        }
    }

    if (lowerResponse.includes('schau mal') || lowerResponse.includes('sieh dir an')) {
        // AI wants to show something
        if (context.folderId) {
            return {
                type: 'point',
                target: `[data-folder-id="${context.folderId}"]`,
                duration: 3000
            };
        }
    }

    return null;
}

/**
 * Enhanced System Prompt with Cursor Command Instructions
 */
export function getCursorAwareSystemPromptAddition(): string {
    return `

## CURSOR CONTROL (MÖRA's Arm)
Du kannst UI-Aktionen auslösen indem du spezielle Befehle einbettest:

Beispiele:
- Element hervorheben: [[MORA_ACTION:{"type":"highlight","target":"#settings-button","duration":2000}]]
- Auf etwas zeigen: [[MORA_ACTION:{"type":"point","target":".planet-item","duration":3000}]]
- Orb pulsieren: [[MORA_ACTION:{"type":"pulse"}]]
- Pane/Fenster öffnen: [[MORA_ACTION:{"type":"pane","action":"open","paneType":"finder","data":{"query":"Rechnung"}}}]]

WICHTIG: Nutze dies SPARSAM und nur wenn es dem User wirklich hilft!
Der Cursor fliegt tatsächlich im UI umher - nutze das für WOW-Momente.
Wenn der User Dokumente sehen will, öffne den "finder".
`;
}

const cursorBridge = {
    parseAIResponse,
    executeCursorCommands,
    suggestCursorAction,
    getCursorAwareSystemPromptAddition
};

export default cursorBridge;

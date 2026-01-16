/**
 * MÔRA Cursor Bridge - AI Controls the Cursor
 * 
 * This module allows AI responses to trigger cursor actions.
 * The AI can embed commands in its response which get parsed and executed.
 * 
 * Command Format (JSON in response):
 * ```
 * [[MORA_ACTION:{"type":"highlight","target":"#element-id","duration":2000}]]
 * ```
 */

export interface CursorCommand {
    type: 'highlight' | 'point' | 'navigate' | 'pulse' | 'idle';
    target?: string; // CSS selector or element ID
    position?: { x: number; y: number };
    duration?: number;
    message?: string;
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
    if (!moraAI) {
        console.warn('[CursorBridge] moraAI not available - cursor commands skipped');
        return;
    }

    commands.forEach((cmd, index) => {
        // Stagger commands with delay
        setTimeout(() => {
            switch (cmd.type) {
                case 'highlight':
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
                    break;

                case 'point':
                    // Point action - cursor flies to element
                    if (cmd.target) {
                        const event = new CustomEvent('mora-ai-action', {
                            detail: {
                                type: 'point',
                                target: { selector: cmd.target },
                                duration: cmd.duration || 2000
                            }
                        });
                        window.dispatchEvent(event);
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
                    // --- UPGRADE G2: AUTONOMOUS NAVIGATION ---
                    if (cmd.target) {
                        const navEvent = new CustomEvent('mora-navigate', {
                            detail: { targetId: cmd.target }
                        });
                        window.dispatchEvent(navEvent);

                        // Also show a pulse to confirm arrival
                        const pulseEvent = new CustomEvent('mora-orb-pulse', {
                            detail: { intensity: 'low', color: 'emerald' }
                        });
                        window.dispatchEvent(pulseEvent);
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

WICHTIG: Nutze dies SPARSAM und nur wenn es dem User wirklich hilft!
Der Cursor fliegt tatsächlich im UI umher - nutze das für WOW-Momente.
`;
}

export default {
    parseAIResponse,
    executeCursorCommands,
    suggestCursorAction,
    getCursorAwareSystemPromptAddition
};

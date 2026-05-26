"use client";

/**
 * useAmbientMora — Phase A implementation.
 *
 * Single responsibility: talk to Môra AI and execute OS tools.
 *
 * Phase A:  moraAgentClient.chat + cursorBridge.parseAIResponse
 *           Maps CursorCommands → AmbientToolCalls
 *           Fallback: if no tools detected AND defaultFolderId exists → createNode
 *
 * Phase C (migration, drop-in):
 *           Replace sendToMora body → POST /v3/mora/field
 *           Same return type, same executeMoraTools — AmbientRoom never changes.
 */

import { useCallback, useState } from 'react';
import { moraAgentClient, buildChatContext } from '@/lib/api/moraAgentClient';
import { parseAIResponse } from '@/lib/ai/cursorBridge';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';

// ─── Public types ─────────────────────────────────────────────────────────────

export type AmbientToolCall =
    | { tool: 'createNode';            input: { title: string; content: string; folder_id: string } }
    | { tool: 'openPane';              input: { type: string; title?: string; data?: Record<string, unknown> } }
    | { tool: 'navigateToDepartment';  input: { departmentId: string } }
    | { tool: 'searchGlobal';          input: { query: string } };

export interface AmbientMoraResult {
    /** Môra's verbal response (clean, no action tags) */
    text: string;
    /** Parsed tool calls — may be empty */
    toolCalls: AmbientToolCall[];
    /** Short human-readable intent summary */
    intent: string;
}

export interface UseAmbientMoraReturn {
    sendToMora: (transcript: string, defaultFolderId?: string | null) => Promise<AmbientMoraResult>;
    executeMoraTools: (calls: AmbientToolCall[]) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAmbientMora(): UseAmbientMoraReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error,     setError]     = useState<string | null>(null);

    // ── sendToMora (Phase A) ─────────────────────────────────────────────────
    const sendToMora = useCallback(
        async (transcript: string, defaultFolderId?: string | null): Promise<AmbientMoraResult> => {
            if (!transcript.trim()) {
                return { text: '', toolCalls: [], intent: '' };
            }

            setIsLoading(true);
            setError(null);

            try {
                // 1. Call Môra AI
                const response = await moraAgentClient.chat({
                    message: transcript,
                    context: buildChatContext(),
                });

                const rawText = response.response ?? '';

                // 2. Parse action tags from AI text
                const { cleanContent, commands } = parseAIResponse(rawText);

                // 3. Map CursorCommands → AmbientToolCalls
                const toolCalls: AmbientToolCall[] = [];

                for (const cmd of commands) {
                    if (cmd.type === 'navigate' && cmd.target) {
                        toolCalls.push({
                            tool:  'navigateToDepartment',
                            input: { departmentId: cmd.target },
                        });
                    } else if (cmd.type === 'pane' && cmd.paneType) {
                        toolCalls.push({
                            tool:  'openPane',
                            input: {
                                type:  cmd.paneType,
                                title: cmd.message ?? cmd.paneType,
                                data:  cmd.data ?? {},
                            },
                        });
                    }
                }

                // 4. Fallback: if no tool commands detected AND we have a folder → createNode
                if (toolCalls.length === 0 && defaultFolderId) {
                    const title = transcript.trim().slice(0, 100);
                    toolCalls.push({
                        tool:  'createNode',
                        input: {
                            title,
                            content:   transcript.trim(),
                            folder_id: defaultFolderId,
                        },
                    });
                }

                // 5. Build intent summary
                const intent = buildIntent(toolCalls, transcript);

                return { text: cleanContent || rawText, toolCalls, intent };

            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
                setError(msg);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    // ── executeMoraTools ─────────────────────────────────────────────────────
    const executeMoraTools = useCallback(
        async (calls: AmbientToolCall[]): Promise<void> => {
            for (const call of calls) {
                switch (call.tool) {
                    case 'createNode': {
                        const addNode = useMoraStore.getState().addNode;
                        await addNode({
                            title:     call.input.title,
                            content:   call.input.content,
                            folder_id: call.input.folder_id,
                            type:      'note',
                        });
                        break;
                    }

                    case 'openPane': {
                        const { openPane } = usePaneStore.getState();
                        openPane({
                            id:    `ambient-${call.input.type}-${Date.now()}`,
                            type:  call.input.type as any,
                            title: call.input.title ?? call.input.type,
                            size:  { width: 900, height: 650 },
                            data:  call.input.data ?? {},
                        });
                        break;
                    }

                    case 'navigateToDepartment': {
                        const { navigateToDepartment } = useNavStore.getState();
                        navigateToDepartment(call.input.departmentId);
                        break;
                    }

                    case 'searchGlobal': {
                        const { openPane } = usePaneStore.getState();
                        openPane({
                            id:    `ambient-search-${Date.now()}`,
                            type:  'search' as any,
                            title: 'Suche',
                            size:  { width: 860, height: 620 },
                            data:  { query: call.input.query },
                        });
                        break;
                    }
                }
            }
        },
        [],
    );

    return { sendToMora, executeMoraTools, isLoading, error };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildIntent(calls: AmbientToolCall[], transcript: string): string {
    if (calls.length === 0) return transcript.slice(0, 80);

    const first = calls[0];
    switch (first.tool) {
        case 'createNode':
            return `Node erstellen: „${first.input.title}"`;
        case 'openPane':
            return `${first.input.type} öffnen`;
        case 'navigateToDepartment':
            return `Navigiere zu Department ${first.input.departmentId}`;
        case 'searchGlobal':
            return `Suche nach „${first.input.query}"`;
        default:
            return transcript.slice(0, 80);
    }
}

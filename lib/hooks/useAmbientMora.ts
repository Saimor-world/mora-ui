"use client";

/**
 * useAmbientMora - Phase C implementation.
 *
 * Single responsibility: talk to Mora Field and execute OS UI tools.
 * AmbientRoom stays stable because backend tool intents are mapped to the
 * existing AmbientToolCall union here.
 */

import { useCallback, useState } from 'react';
import { corePost } from '@/lib/api/http';
import { buildChatContext, type ChatContext } from '@/lib/api/moraAgentClient';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import type { UiToolCall } from '@/lib/lagefeld/types';

export type AmbientToolCall =
    | { tool: 'createNode';           input: { title: string; content: string; folder_id: string } }
    | { tool: 'openPane';             input: { type: string; title?: string; data?: Record<string, unknown> } }
    | { tool: 'navigateToDepartment'; input: { departmentId: string } }
    | { tool: 'searchGlobal';         input: { query: string } };

export interface AmbientMoraResult {
    text: string;
    toolCalls: AmbientToolCall[];
    intent: string;
}

export interface UseAmbientMoraReturn {
    sendToMora: (transcript: string, defaultFolderId?: string | null, sessionId?: string) => Promise<AmbientMoraResult>;
    executeMoraTools: (calls: AmbientToolCall[]) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

type FieldToolCall = {
    type: string;
    label?: string;
    payload?: Record<string, any>;
    risk?: string;
    requiresConfirmation?: boolean;
};

type FieldResponse = {
    text?: string;
    intent?: string;
    toolCalls?: FieldToolCall[];
};

const LAGEFELD_UI_TOOLS = new Set<UiToolCall['name']>([
    'placeCard',
    'connect',
    'placeSymbol',
    'proposeAction',
]);

export function useAmbientMora(): UseAmbientMoraReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendToMora = useCallback(
        async (transcript: string, defaultFolderId?: string | null, sessionId?: string): Promise<AmbientMoraResult> => {
            if (!transcript.trim()) {
                return { text: '', toolCalls: [], intent: '' };
            }

            setIsLoading(true);
            setError(null);

            try {
                const requestBody: Record<string, unknown> = {
                    message: transcript,
                    context: buildFieldContext(buildChatContext(), defaultFolderId),
                };
                if (sessionId) {
                    requestBody.session_id = sessionId;
                }

                const response = await corePost('/v3/mora/field', requestBody) as FieldResponse | null;

                if (!response) {
                    throw new Error('Mora Field ist nicht erreichbar.');
                }

                const toolCalls = mapFieldToolCalls(response.toolCalls ?? [], transcript, defaultFolderId);

                return {
                    text: response.text ?? '',
                    toolCalls,
                    intent: response.intent || buildIntent(toolCalls, transcript),
                };
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

    const executeMoraTools = useCallback(
        async (calls: AmbientToolCall[]): Promise<void> => {
            const response = await corePost('/v3/mora/field/execute', {
                tools: calls.map(call => ({ tool: call.tool, input: call.input })),
                context: buildFieldContext(buildChatContext()),
            }) as { results?: Array<{ ok: boolean; error?: string }>; uiActions?: AmbientToolCall[] } | null;

            if (!response) {
                throw new Error('Mora Field konnte die Aktion nicht ausführen.');
            }

            const failed = (response.results ?? []).find(result => !result.ok);
            if (failed) {
                throw new Error(failed.error || 'Mora Field Aktion fehlgeschlagen.');
            }

            for (const call of response.uiActions ?? []) {
                switch (call.tool) {
                    case 'createNode': {
                        const addNode = useMoraStore.getState().addNode;
                        await addNode({
                            title: call.input.title,
                            content: call.input.content,
                            folder_id: call.input.folder_id,
                            type: 'note',
                        });
                        break;
                    }

                    case 'openPane': {
                        const { openPane } = usePaneStore.getState();
                        openPane({
                            id: `ambient-${call.input.type}-${Date.now()}`,
                            type: call.input.type as any,
                            title: call.input.title ?? call.input.type,
                            size: { width: 900, height: 650 },
                            data: call.input.data ?? {},
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
                            id: `ambient-search-${Date.now()}`,
                            type: 'search' as any,
                            title: 'Suche',
                            size: { width: 860, height: 620 },
                            data: { query: call.input.query },
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

function buildFieldContext(context: ChatContext | undefined, defaultFolderId?: string | null): Record<string, unknown> {
    return {
        level: context?.view_level,
        entityId: context?.node_id || context?.folder_id || context?.space_id || context?.department_id || context?.company_id,
        entityType: context?.node_id ? 'node' : context?.folder_id ? 'folder' : context?.space_id ? 'space' : context?.department_id ? 'department' : context?.company_id ? 'company' : undefined,
        companyId: context?.company_id,
        departmentId: context?.department_id,
        spaceId: context?.space_id,
        folderId: context?.folder_id || defaultFolderId || undefined,
        source: 'ambient-room',
        surface: context?.route_path,
        metadata: {
            layer: context?.layer,
            routePath: context?.route_path,
            defaultFolderId: defaultFolderId || undefined,
        },
    };
}

function mapFieldToolCalls(
    calls: FieldToolCall[],
    transcript: string,
    defaultFolderId?: string | null,
): AmbientToolCall[] {
    const toolCalls: AmbientToolCall[] = [];
    const lagefeldActions: UiToolCall[] = [];

    for (const call of calls) {
        const payload = call.payload ?? {};

        if (LAGEFELD_UI_TOOLS.has(call.type as UiToolCall['name'])) {
            lagefeldActions.push({
                name: call.type as UiToolCall['name'],
                input: payload,
            });
            continue;
        }

        if (call.type === 'search') {
            toolCalls.push({ tool: 'searchGlobal', input: { query: String(payload.query ?? transcript) } });
            continue;
        }

        if (call.type === 'open_pane') {
            toolCalls.push({
                tool: 'openPane',
                input: {
                    type: String(payload.paneType ?? payload.pane_type ?? 'finder'),
                    title: call.label,
                    data: payload.data ?? payload,
                },
            });
            continue;
        }

        if (call.type === 'navigate') {
            const target = payload.target ?? {};
            const departmentId = payload.departmentId ?? target.departmentId ?? (
                target.entityType === 'department' ? target.entityId : undefined
            );

            if (departmentId) {
                toolCalls.push({ tool: 'navigateToDepartment', input: { departmentId: String(departmentId) } });
                continue;
            }

            toolCalls.push({
                tool: 'openPane',
                input: { type: 'finder', title: call.label ?? 'Finder', data: target },
            });
            continue;
        }

        if (call.type === 'create_note') {
            const content = String(payload.content ?? transcript);
            toolCalls.push({
                tool: 'createNode',
                input: {
                    title: content.trim().slice(0, 100),
                    content,
                    folder_id: defaultFolderId || '',
                },
            });
            continue;
        }
    }

    if (lagefeldActions.length > 0) {
        toolCalls.push({
            tool: 'openPane',
            input: {
                type: 'lagefeld',
                title: 'Lagefeld',
                data: {
                    uiActions: lagefeldActions,
                    source: 'ambient-room',
                    prompt: transcript,
                },
            },
        });
    }

    return toolCalls;
}

function buildIntent(calls: AmbientToolCall[], transcript: string): string {
    if (calls.length === 0) return transcript.slice(0, 80);

    const first = calls[0];
    switch (first.tool) {
        case 'createNode':
            return `Node erstellen: "${first.input.title}"`;
        case 'openPane':
            return `${first.input.type} öffnen`;
        case 'navigateToDepartment':
            return `Navigiere zu Department ${first.input.departmentId}`;
        case 'searchGlobal':
            return `Suche nach "${first.input.query}"`;
        default:
            return transcript.slice(0, 80);
    }
}

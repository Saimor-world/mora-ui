"use client";

/**
 * useAmbientMora - Phase C implementation.
 *
 * Single responsibility: talk to Mora Field and execute OS UI tools.
 * AmbientRoom stays stable because backend tool intents are mapped to the
 * existing AmbientToolCall union here.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { corePost } from '@/lib/api/http';
import { buildChatContext, type ChatContext } from '@/lib/api/moraAgentClient';
import { getMoraPlaygroundTarget } from '@/lib/os/moraPlayground';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import type { UiToolCall } from '@/lib/lagefeld/types';

type CreateNodeInput = { title: string; content: string; folder_id?: string; folder_ref?: string; type?: string };
type CreateFolderInput = { name: string; space_id?: string; parent_folder_id?: string; ref?: string };
type UpdateNodeInput = { node_id: string; title?: string; content?: string };
type RememberFactInput = { fact: string; category?: string };

// Write tools are executed server-side by /v3/mora/field/execute exactly as
// Môra proposed them; the confirmation card lists every one of them.
export type AmbientToolCall =
    | { tool: 'createNode';           input: CreateNodeInput }
    | { tool: 'createFolder';         input: CreateFolderInput }
    | { tool: 'updateNode';           input: UpdateNodeInput }
    | { tool: 'rememberFact';         input: RememberFactInput }
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

            // Writes are not transactional: say how many already went through.
            const results = response.results ?? [];
            const failed = results.filter(result => !result.ok);
            if (failed.length > 0) {
                const firstError = failed[0].error || 'Mora Field Aktion fehlgeschlagen.';
                const succeeded = results.length - failed.length;
                throw new Error(
                    succeeded > 0
                        ? `${succeeded} von ${results.length} Aktionen ausgeführt. Fehler: ${firstError}`
                        : firstError,
                );
            }
            if (results.length > 0) {
                toast.success(results.length === 1 ? 'Aktion ausgeführt.' : `${results.length} Aktionen ausgeführt.`);
            }

            for (const call of response.uiActions ?? []) {
                switch (call.tool) {
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
    const playgroundTarget = getMoraPlaygroundTarget();
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
            playgroundTarget: playgroundTarget || undefined,
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
            const input: CreateNodeInput = {
                title: String(payload.title || content.trim().slice(0, 100)),
                content,
            };
            if (payload.folder_ref) {
                input.folder_ref = String(payload.folder_ref);
            } else {
                input.folder_id = String(payload.folder_id || defaultFolderId || '');
            }
            if (payload.type) input.type = String(payload.type);
            toolCalls.push({ tool: 'createNode', input });
            continue;
        }

        if (call.type === 'create_folder' && payload.name) {
            const input: CreateFolderInput = { name: String(payload.name) };
            if (payload.space_id) input.space_id = String(payload.space_id);
            if (payload.parent_folder_id) input.parent_folder_id = String(payload.parent_folder_id);
            if (payload.ref) input.ref = String(payload.ref);
            toolCalls.push({ tool: 'createFolder', input });
            continue;
        }

        if (call.type === 'update_node' && payload.node_id) {
            const input: UpdateNodeInput = { node_id: String(payload.node_id) };
            if (payload.title) input.title = String(payload.title);
            if (payload.content !== undefined && payload.content !== null) input.content = String(payload.content);
            toolCalls.push({ tool: 'updateNode', input });
            continue;
        }

        if (call.type === 'remember_fact' && payload.fact) {
            const input: RememberFactInput = { fact: String(payload.fact) };
            if (payload.category) input.category = String(payload.category);
            toolCalls.push({ tool: 'rememberFact', input });
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
        case 'createFolder':
            return `Ordner anlegen: "${first.input.name}"`;
        case 'updateNode':
            return `Node ändern: "${first.input.title ?? first.input.node_id}"`;
        case 'rememberFact':
            return `Merken: "${first.input.fact}"`;
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
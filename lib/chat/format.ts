import type { AgentResponse } from '@/lib/api/cognitionClient';

/**
 * Lightweight markdown -> HTML renderer for chat messages (bold, italic, code,
 * h1-h3, bullet lists, paragraphs). Extracted verbatim from apps/chat/index.tsx.
 */
export function renderMarkdown(raw: string): string {
    const fmt = (s: string) => s
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:0 4px;border-radius:3px;font-size:0.85em;color:#6ee7b7">$1</code>');

    const lines = raw.split('\n');
    const out: string[] = [];
    let listType: 'ul' | null = null;

    const closeList = () => {
        if (listType) { out.push('</ul>'); listType = null; }
    };

    for (const line of lines) {
        const ulMatch = line.match(/^[\*\-]\s+(.+)/);
        const hMatch = line.match(/^(#{1,3})\s+(.+)/);

        if (hMatch) {
            closeList();
            const tag = hMatch[1].length === 1 ? 'h3' : hMatch[1].length === 2 ? 'h4' : 'h5';
            out.push(`<${tag} style="font-weight:600;margin:10px 0 2px;color:rgba(255,255,255,0.92)">${fmt(hMatch[2])}</${tag}>`);
        } else if (ulMatch) {
            if (!listType) {
                out.push('<ul style="margin:6px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">');
                listType = 'ul';
            }
            out.push(`<li style="display:flex;gap:6px;align-items:flex-start"><span style="color:rgba(110,231,183,0.65);flex-shrink:0;margin-top:1px">•</span><span>${fmt(ulMatch[1])}</span></li>`);
        } else {
            closeList();
            if (line.trim() === '') {
                out.push('<div style="height:6px"></div>');
            } else {
                out.push(`<p style="margin:0;line-height:1.6">${fmt(line)}</p>`);
            }
        }
    }
    closeList();
    return out.join('');
}

/**
 * Coerces an agent response payload into a human message string. Handles raw
 * strings, fenced ```json blocks, and embedded JSON objects with message/thought
 * fields, decoding escaped unicode. Extracted verbatim from apps/chat/index.tsx.
 */
export function normalizeAgentResponse(input: unknown): string {
    if (typeof input !== 'string') return 'Ich konnte die Antwort nicht verarbeiten.';

    const decodeEscapedUnicode = (text: string) =>
        text.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));

    const trimmed = input.trim();
    const candidates = [trimmed];

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) candidates.push(fencedMatch[1].trim());

    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) candidates.push(objectMatch[0].trim());

    for (const candidate of candidates) {
        if (!candidate.startsWith('{') || !candidate.endsWith('}')) continue;
        try {
            const parsed = JSON.parse(candidate) as Record<string, unknown>;
            if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
                return decodeEscapedUnicode(parsed.message);
            }
            if (typeof parsed.thought === 'string' && parsed.thought.trim().length > 0) {
                return decodeEscapedUnicode(parsed.thought);
            }
        } catch {
            // try next candidate
        }
    }
    return decodeEscapedUnicode(input);
}

/**
 * Extract plan_id from an agent response that created a work-session plan.
 * Checks the promoted top-level field first, then scans tools_executed as fallback.
 */
export function extractPlanId(agentResponse: AgentResponse): string | null {
    if (agentResponse.work_session_plan?.plan_id) return agentResponse.work_session_plan.plan_id;
    for (const tool of agentResponse.tools_executed ?? []) {
        if (tool.tool === 'work_session_plan' || tool.tool === 'create_work_session_plan') {
            const result = tool.result as Record<string, unknown> | undefined;
            if (typeof result?.plan_id === 'string' && result.plan_id) return result.plan_id;
        }
    }
    return null;
}

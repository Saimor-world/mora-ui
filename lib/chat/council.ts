/**
 * MÔRAs Rat im Chat. Der Rat ist keine eigene Figur, sondern MÔRA, die mehrere
 * Blickwinkel befragt. Hier wird das Ergebnis von `convene_council` aus
 * `tools_executed` gelesen — defensiv, ohne Rohdaten oder Prompts.
 *
 * Regeln:
 * - Widerspruch wird immer gezeigt, nie weggeglättet.
 * - Ein Blickwinkel ohne Antwort erscheint als „ohne Antwort“, nie als Zustimmung.
 * - Der Rat führt nichts aus; die Karte hat keine Aktions-Knöpfe.
 */

export type CouncilStance = 'dafür' | 'dagegen' | 'bedingt' | 'unklar';

export interface CouncilVoice {
    role: string;
    label: string;
    stance: CouncilStance;
    advice: string;
    risks: string[];
    available: boolean;
}

export interface CouncilView {
    question: string;
    verdict: CouncilStance;
    consensus: boolean;
    summary: string;
    voices: CouncilVoice[];
    dissentRoles: string[];
}

interface ToolLike {
    tool: string;
    success: boolean;
    result?: unknown;
}

const STANCES: CouncilStance[] = ['dafür', 'dagegen', 'bedingt', 'unklar'];
const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const stance = (v: unknown): CouncilStance => (STANCES.includes(v as CouncilStance) ? (v as CouncilStance) : 'unklar');

export function extractCouncil(tools: ToolLike[] | undefined | null): CouncilView | null {
    if (!Array.isArray(tools)) return null;
    const hit = [...tools].reverse().find((t) => t?.tool === 'convene_council' && t.success);
    const r = hit?.result as Record<string, any> | undefined;
    if (!r || r.kind !== 'council' || !Array.isArray(r.perspectives)) return null;
    const voices: CouncilVoice[] = r.perspectives.slice(0, 6).map((p: any) => ({
        role: str(p?.role, 40),
        label: str(p?.label, 40) || str(p?.role, 40),
        stance: stance(p?.stance),
        advice: str(p?.advice),
        risks: Array.isArray(p?.risks) ? p.risks.map((x: unknown) => str(x, 200)).filter(Boolean).slice(0, 5) : [],
        available: p?.available === true,
    }));
    const syn = (r.synthesis ?? {}) as Record<string, any>;
    return {
        question: str(r.question, 300),
        verdict: stance(syn.verdict),
        consensus: syn.consensus === true,
        summary: str(syn.summary, 400),
        voices,
        dissentRoles: Array.isArray(syn.dissent) ? syn.dissent.map((d: any) => str(d?.role, 40)).filter(Boolean) : [],
    };
}

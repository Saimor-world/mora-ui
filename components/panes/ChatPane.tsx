'use client';

/**
 * ChatPane - Mora AI Conversation Interface
 *
 * MASTERBIBEL: Môra is your Disney fairy AI companion.
 * This pane allows direct conversation with Môra (via Ollama/Gemini/etc).
 *
 * Commands like "show me department XY" trigger cursor navigation.
 *
 * Memory Integration (2026-02):
 * - Save insights from Mora responses
 * - Detect memory keywords in user input
 * - Show relevant memories for context
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { learnInsight, searchMemory } from '@/lib/api/coreClient';
import { buildChatContext } from '@/lib/api/moraAgentClient';
import { parseAIResponse, executeCursorCommands } from '@/lib/ai/cursorBridge';
import { useMoraStream } from '@/lib/hooks/useMoraStream';
import { executeAgenticLoop } from '@/lib/api/cognitionClient';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { Send, Sparkles, Loader2, Bot, User, Brain, BookmarkPlus, Lightbulb, Check, Wifi, WifiOff, Maximize2, Minimize2, LayoutList } from 'lucide-react';
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import type { MemoryCategory, MemorySearchResult } from '@/lib/types/memory';
import { dispatchNavigationResult, openSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import { fetchWorkSessionPlan, resolveOpenIntent, type OpenIntentResolution } from '@/lib/api/coreClient';
import { dispatchWorkSessionPlan, WORK_SESSION_PLAN_EVENT, type WorkSessionShellSummary } from '@/lib/utils/moraExplanation';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';
import { CommandReceipt, type CommandReceiptChip } from '@/components/ui/CommandReceipt';
import { MoraContextLabel, type MoraScope } from '@/components/mora/MoraContextLabel';
import { openMoraCenter } from '@/lib/utils/openMoraCenter';
import { detectMemoryIntent, extractInsightFromRequest } from '@/lib/chat/memoryIntent';

interface PendingAction {
    tool_name: string;
    params: Record<string, any>;
    risk_level: string;
    confirmation_token: string;
    action_id: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
    savedAsInsight?: boolean; // Track if message was saved as insight
    pendingAction?: PendingAction;
    /** set when the agent produced a work-session plan; used to open WorkSessionPane */
    planId?: string;
}

function buildOpenIntentReceipt(intent: OpenIntentResolution, query: string): {
    label: string;
    title: string;
    body?: string;
    chips: CommandReceiptChip[];
    footer?: string;
} {
    const chips: CommandReceiptChip[] = [];
    if (query.trim()) {
        chips.push({ label: `"${query.trim()}"` });
    }
    if (intent.destination?.path) {
        chips.push({ label: intent.destination.path });
    } else if (intent.destination?.label) {
        chips.push({ label: intent.destination.label });
    }
    if (intent.next?.label) {
        chips.push({ label: intent.next.label, tone: intent.resolution === 'choose' ? 'amber' : intent.resolution === 'act' ? 'cyan' : 'slate' });
    }

    return {
        label: intent.headline || 'Treffer',
        title: intent.open_explanation?.headline || intent.reason || `Suche fuer "${query}"`,
        body: intent.open_explanation?.reason || intent.reason || undefined,
        chips,
        footer: intent.next?.message,
    };
}

interface ChatPaneProps {
    id?: string;
}

// ─── Lightweight markdown renderer ────────────────────────────────────────────
function renderMarkdown(raw: string): string {
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
// ──────────────────────────────────────────────────────────────────────────────

function normalizeAgentResponse(input: unknown): string {
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
function extractPlanId(agentResponse: import('@/lib/api/cognitionClient').AgentResponse): string | null {
    if (agentResponse.work_session_plan?.plan_id) return agentResponse.work_session_plan.plan_id;
    for (const tool of agentResponse.tools_executed ?? []) {
        if (tool.tool === 'work_session_plan' || tool.tool === 'create_work_session_plan') {
            const result = tool.result as Record<string, unknown> | undefined;
            if (typeof result?.plan_id === 'string' && result.plan_id) return result.plan_id;
        }
    }
    return null;
}

function isLikelyFileOperationIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return [
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b.*\b(ordner|folder)\b/,
        /\b(verschiebe|move)\b.*\b(datei|dateien|dokument|dokumente|node|nodes|file|files|ordner|folder)\b/,
        /\b(benenne|umbenennen|rename)\b.*\b(datei|dokument|node|file)\b/,
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b.*\b(notiz|note)\b/,
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b.*\b(entwurf|draft|briefing)\b/,
        /\b(aktualisiere|update|ändere|aendere|überarbeite|ueberarbeite|schreibe um)\b.*\b(notiz|note|entwurf|draft|dokument)\b/,
    ].some((pattern) => pattern.test(lower));
}

function shouldPreferAgenticLoop(text: string): boolean {
    const lower = text.toLowerCase();
    return [
        /\b(erstelle|erzeuge|anlegen|lege an|create)\b/,
        /\b(aktualisiere|update|ändere|aendere|überarbeite|ueberarbeite|rewrite|schreib um)\b/,
        /\b(verschiebe|move|sortiere|ordne|organisiere)\b/,
        /\b(lösche|loesche|entferne|delete|archive)\b/,
        /\b(teile|share|veröffentliche|veroeffentliche)\b/,
        /\b(fasse zusammen|zusammenfassen|review|prüfe|pruefe|analysiere|compare|vergleiche)\b/,
        /\b(starte|setze fort|continue|mach weiter|plane|bereite vor|arbeite aus)\b/,
    ].some((pattern) => pattern.test(lower));
}

function toChatOpenableResult(candidate: import('@/lib/api/coreClient').OpenIntentCandidate): OpenableSearchResult {
    const normalizedType = (
        candidate.type === 'department'
        || candidate.type === 'space'
        || candidate.type === 'folder'
        || candidate.type === 'file'
        || candidate.type === 'node'
    ) ? candidate.type : 'node';

    return {
        id: candidate.id,
        title: candidate.title,
        type: normalizedType,
        subtitle: candidate.scope_path || candidate.path,
        path: candidate.scope_path || candidate.path,
        companyId: candidate.company_id,
        departmentId: candidate.department_id,
        spaceId: candidate.space_id,
        folderId: candidate.folder_id,
        nodeId: candidate.node_id,
    };
}

// ─── Memory: Save Insight Button ───
const SaveInsightButton: React.FC<{
    content: string;
    companyId?: string;
    onSaved: () => void;
    isSaved: boolean;
}> = ({ content, companyId, onSaved, isSaved }) => {
    const [saving, setSaving] = useState(false);
    const [showCategorySelect, setShowCategorySelect] = useState(false);

    const handleSave = async (category: MemoryCategory = 'context') => {
        if (!companyId) return;
        setSaving(true);
        try {
            await learnInsight({
                insight: content,
                category,
                auto_commit: true,
                company_id: companyId
            });
            onSaved();
            setShowCategorySelect(false);
        } catch (err) {
            console.error('[ChatPane] Failed to save insight:', err);
        } finally {
            setSaving(false);
        }
    };

    if (isSaved) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/60 ml-2">
                <Check size={10} />
                Gespeichert
            </span>
        );
    }

    return (
        <div className="relative inline-block ml-2">
            <button
                onClick={() => setShowCategorySelect(!showCategorySelect)}
                disabled={saving}
                className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-emerald-400 transition-colors"
                title="Als Insight speichern"
            >
                {saving ? (
                    <Loader2 size={10} className="animate-spin" />
                ) : (
                    <BookmarkPlus size={10} />
                )}
                <span className="hidden sm:inline">Merken</span>
            </button>

            <AnimatePresence>
                {showCategorySelect && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-1 bg-black/90 border border-white/10 rounded-lg p-2 z-50 min-w-[140px]"
                    >
                        <p className="text-[10px] text-white/50 mb-1.5 px-1">Kategorie:</p>
                        {(['context', 'fact', 'preference', 'summary'] as MemoryCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleSave(cat)}
                                className="block w-full text-left text-xs px-2 py-1 text-white/70 hover:bg-emerald-500/20 hover:text-emerald-300 rounded transition-colors capitalize"
                            >
                                {cat === 'context' ? 'Kontext' :
                                    cat === 'fact' ? 'Fakt' :
                                        cat === 'preference' ? 'Präferenz' :
                                            cat === 'summary' ? 'Zusammenfassung' : cat}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Memory: Hint for detected memory intent ───
const MemoryHint: React.FC<{
    onConfirm: () => void;
    onDismiss: () => void;
}> = ({ onConfirm, onDismiss }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs"
    >
        <Lightbulb size={14} className="text-emerald-400 shrink-0" />
        <span className="text-white/70">Soll ich das speichern?</span>
        <button
            onClick={onConfirm}
            className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded transition-colors"
        >
            Ja
        </button>
        <button
            onClick={onDismiss}
            className="px-2 py-0.5 text-white/40 hover:text-white/60 transition-colors"
        >
            Nein
        </button>
    </motion.div>
);

// ─── Memory: Relevant Memories Display ───
const RelevantMemories: React.FC<{
    memories: MemorySearchResult[];
    isMemoryBasis?: boolean;
    onOpenMemory?: () => void;
    onDismiss: () => void;
}> = ({ memories, isMemoryBasis = false, onOpenMemory, onDismiss }) => {
    if (memories.length === 0 && !isMemoryBasis) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`border-b border-white/5 ${isMemoryBasis
                ? 'bg-gradient-to-r from-amber-500/10 via-purple-500/8 to-transparent'
                : 'bg-gradient-to-r from-purple-500/5 to-transparent'
                }`}
        >
            <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-2 text-xs ${isMemoryBasis ? 'text-amber-200/80' : 'text-purple-300/70'}`}>
                        <Brain size={12} />
                        <span>{isMemoryBasis ? 'Gedächtnisbasis dieser Antwort' : 'Relevante Erinnerungen'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {onOpenMemory && (
                            <button
                                onClick={onOpenMemory}
                                className="text-[11px] text-emerald-300/80 hover:text-emerald-200 transition-colors"
                            >
                                Im Memory öffnen
                            </button>
                        )}
                        <button
                            onClick={onDismiss}
                            className="text-white/30 hover:text-white/50 text-xs"
                        >
                            Ausblenden
                        </button>
                    </div>
                </div>
                {isMemoryBasis && (
                    <p className="mb-2 text-[11px] leading-relaxed text-white/55">
                        Mora hat diese Antwort auf gespeichertes Wissen gestuetzt. Hier siehst du die naheliegendsten Gedaechtnistreffer im aktuellen Organisationskontext.
                    </p>
                )}
                <div className="space-y-1.5">
                    {memories.slice(0, 3).map((mem) => (
                        <div
                            key={mem.id}
                            className={`text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded border-l-2 ${isMemoryBasis ? 'border-amber-400/40' : 'border-purple-500/30'}`}
                        >
                            <div className="line-clamp-2">{mem.summary}</div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-white/35">
                                <span>{mem.category || 'memory'}</span>
                                {typeof mem.score === 'number' && <span>{Math.round(mem.score * 100)}%</span>}
                            </div>
                        </div>
                    ))}
                    {memories.length === 0 && isMemoryBasis && (
                        <div className="text-xs text-white/45 bg-white/5 px-2 py-1.5 rounded border-l-2 border-amber-400/30">
                            Kein einzelner Gedächtnistreffer hervorgehoben, aber die Antwort wurde aus gespeichertem Kontext abgeleitet.
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ─── SetupRequiredCard ────────────────────────────────────────────────────────

interface SetupRequiredCardProps {
    onOpenSettings?: () => void;
}

function SetupRequiredCard({ onOpenSettings }: SetupRequiredCardProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] text-center">
            <p className="text-sm font-medium text-foreground/80">
                Kein Kontext aktiv
            </p>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                Oeffne zuerst das Beispielsystem oder waehle einen Bereich, damit Mora sinnvoll arbeiten kann.
            </p>
            {onOpenSettings && (
                <button
                    id="chat-setup-settings"
                    data-agency-id="chat-setup-settings"
                    onClick={onOpenSettings}
                    className="mt-1 text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                    Einstellungen oeffnen
                </button>
            )}
        </div>
    );
}

// ─── Context-Aware Chat Suggestions ───
const ChatSuggestions: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
    const { viewLevel, activeDepartmentId, activeCompanyId } = useNavStore();
    const orbState = useOrbStore((s) => s.orbState);
    const { data: departments } = useDepartments(activeCompanyId);
    const safeDepartments = React.useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    const suggestions = React.useMemo(() => {
        const dept = safeDepartments.find(d => d.id === activeDepartmentId);

        if (viewLevel === 'folder' || viewLevel === 'space') {
            return [
                'Fasse diesen Bereich zusammen',
                'Was fehlt hier noch?',
                dept ? `Zurück zu ${dept.name}` : 'Übersicht zeigen',
            ];
        }
        if (viewLevel === 'department' && dept) {
            return [
                `Was gibt es Neues in ${dept.name}?`,
                'Welche Dokumente sind wichtig?',
                'Zeig mir alle Spaces',
            ];
        }
        if (orbState === 'alert') {
            return [
                'Was braucht Aufmerksamkeit?',
                'Zeig mir die Alerts',
                'Status Report',
            ];
        }
        // Default / Core level
        const firstDept = safeDepartments[0]?.name;
        return [
            firstDept ? `Zeig mir ${firstDept}` : 'Zeig mir die Abteilungen',
            'Was gibt es Neues?',
            'Hilf mir beim Organisieren',
        ];
    }, [viewLevel, safeDepartments, activeDepartmentId, orbState]);

    return (
        <div className="flex gap-2 mt-2 flex-wrap">
            {suggestions.map((suggestion) => (
                <button
                    key={suggestion}
                    onClick={() => onSelect(suggestion)}
                    className="text-xs px-3 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-full text-emerald-100/60 hover:text-emerald-300 transition-all duration-200"
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
};
// Memoize so parent stream re-renders don't re-run this subtree
const ChatSuggestionsMemo = React.memo(ChatSuggestions);

export function ChatPane({ id = 'chat-main' }: ChatPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const activePlanId = useWorkSessionStore((s) => s.activePlanId);
    const activeSessionId = useWorkSessionStore((s) => s.activeSessionId);
    const setActiveSession = useWorkSessionStore((s) => s.setActiveSession);
    const {
        isStandardMode,
        activeCompanyId,
        activeDepartmentId,
        activeSpaceId,
        activeFolderId,
        viewLevel,
    } = useNavStore();
    const { data: departments } = useDepartments(activeCompanyId);
    const pane = getPane(id);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    // Scope derivation for MoraContextLabel
    const activeDepartment = useMemo(
        () => safeDepartments.find((d) => d.id === activeDepartmentId) ?? undefined,
        [safeDepartments, activeDepartmentId]
    );

    const derivedScope = useMemo((): { scope: MoraScope; sourceName?: string } => {
        // 'object' scope (active folder/document) is Phase 2 -- requires active-object state
        // TODO: add 'object' branch when active-object state is surfaced (spec Section 5)
        if (activeDepartment) return { scope: 'shared', sourceName: activeDepartment.name };
        return { scope: 'shared' };
    }, [activeDepartment]);

    // Streaming hook — real AI, token-by-token
    const {
        sendMessage: streamSend,
        streamingText,
        isStreaming,
        error: streamError,
        messages: streamHistory,
        clearHistory,
    } = useMoraStream();

    const [messages, setMessages] = useState<Message[]>(() => {
        const safe: Array<{ name: string }> = [];
        const d1 = safe[0]?.name ?? 'R&D';
        const d2 = safe[1]?.name ?? 'Product';
        return [{
            id: 'welcome',
            role: 'assistant',
            content: `Hallo, ich bin Mora.

Ich bin dein Arbeitskontext im System, nicht nur ein Chat:
- **"Zeig mir ${d1}"** → ich navigiere dorthin
- **"Was ist neu?"** → ich fasse reale Signale zusammen
- **"Was laeuft in ${d2}?"** → ich suche in Inhalten und Aktivitaet
- **"Merke dir ..."** → ich speichere belastbare Fakten fuer spaeter

Wenn etwas fehlt, sage ich es klar. Womit soll ich beginnen?`,
            timestamp: new Date()
        }];
    });
    const [input, setInput] = useState('');
    // isLoading is true for navigation/search intents (non-streaming)
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const initialMessageProcessed = useRef(false);
    const hasPromptedSetupRef = useRef(false);

    // Memory Integration State
    const [memoryHint, setMemoryHint] = useState<{ show: boolean; content: string }>({ show: false, content: '' });
    const [relevantMemories, setRelevantMemories] = useState<MemorySearchResult[]>([]);
    const [showMemories, setShowMemories] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [ambiguityChoice, setAmbiguityChoice] = useState<{
        query: string;
        results: OpenableSearchResult[];
        receipt: ReturnType<typeof buildOpenIntentReceipt>;
    } | null>(null);
    const [openIntentReceipt, setOpenIntentReceipt] = useState<{
        query: string;
        receipt: ReturnType<typeof buildOpenIntentReceipt>;
    } | null>(null);
    const moraCtx = useMoraContext();
    const previousCompanyIdRef = useRef<string | null | undefined>(activeCompanyId);
    const previousAnswerSourceRef = useRef<string | null>(moraCtx.lastAnswerSource);
    const [memoryBasisCompanyId, setMemoryBasisCompanyId] = useState<string | null>(null);
    const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);
    const [activeSessionState, setActiveSessionState] = useState<string | null>(null);

    // Keep the active plan pill in sync with the currently active work session only.
    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<WorkSessionShellSummary>).detail;
            if (!detail || !activePlanId || detail.planId !== activePlanId) return;
            setActiveSessionTitle(detail.title ?? null);
            setActiveSessionState(detail.state ?? null);
        };
        window.addEventListener(WORK_SESSION_PLAN_EVENT, handler as EventListener);
        return () => window.removeEventListener(WORK_SESSION_PLAN_EVENT, handler as EventListener);
    }, [activePlanId]);

    useEffect(() => {
        if (activePlanId) return;
        setActiveSessionTitle(null);
        setActiveSessionState(null);
    }, [activePlanId]);

    // Search for relevant memories based on user query
    const fetchRelevantMemories = useCallback(async (query: string) => {
        if (query.length < 5 || !activeCompanyId) {
            setRelevantMemories([]);
            setShowMemories(false);
            return;
        }
        try {
            const results = await searchMemory(query, 3, activeCompanyId);
            if (results && results.length > 0) {
                setRelevantMemories(results);
                setShowMemories(true);
            } else {
                setRelevantMemories([]);
                setShowMemories(false);
            }
        } catch (err) {
            console.warn('[ChatPane] Memory search failed:', err);
            setRelevantMemories([]);
        }
    }, [activeCompanyId]);

    useEffect(() => {
        if (previousCompanyIdRef.current === activeCompanyId) return;
        previousCompanyIdRef.current = activeCompanyId;
        setRelevantMemories([]);
        setShowMemories(false);
        setMemoryHint({ show: false, content: '' });
        setMemoryBasisCompanyId(null);
    }, [activeCompanyId]);

    useEffect(() => {
        const previous = previousAnswerSourceRef.current;
        if (moraCtx.lastAnswerSource === 'memory' && previous !== 'memory' && activeCompanyId) {
            setMemoryBasisCompanyId(activeCompanyId);
            setShowMemories(true);
        }
        previousAnswerSourceRef.current = moraCtx.lastAnswerSource;
    }, [moraCtx.lastAnswerSource, activeCompanyId]);

    // Mark message as saved
    const markMessageAsSaved = useCallback((messageId: string) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, savedAsInsight: true } : msg
        ));
    }, []);

    // Handle memory hint confirmation
    const handleMemoryConfirm = useCallback(async () => {
        if (!memoryHint.content || !activeCompanyId) return;
        try {
            await learnInsight({
                insight: memoryHint.content,
                category: 'context',
                auto_commit: true,
                company_id: activeCompanyId
            });
        } catch (err) {
            console.error('[ChatPane] Failed to save memory:', err);
        }
        setMemoryHint({ show: false, content: '' });
    }, [memoryHint.content, activeCompanyId]);

    // Auto-scroll to bottom when messages or streaming text changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    useEffect(() => {
        if (moraCtx.isOperational !== false) {
            hasPromptedSetupRef.current = false;
            return;
        }
        if (hasPromptedSetupRef.current) return;

        const timer = window.setTimeout(() => {
            dispatchMoraPresence({
                action: 'point',
                targetId: 'chat-setup-settings',
                message: 'Hier Organisation einrichten',
                source: 'system',
                duration: 3200,
            });
            hasPromptedSetupRef.current = true;
        }, 1800);

        return () => window.clearTimeout(timer);
    }, [moraCtx.isOperational]);

    // Fullscreen: sync body class + fire event bus for MoraShell
    useEffect(() => {
        document.body.classList.toggle('chat-fullscreen', isFullscreen);
        window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
            detail: { paneId: id, isFullscreen }
        }));
    }, [isFullscreen, id]);

    // Fullscreen: cleanup on unmount (or id change) — signal MoraShell to remove this pane from fullscreen set.
    // Always dispatches isFullscreen: false — intentional stale closure; [id] dep only.
    useEffect(() => {
        return () => {
            document.body.classList.remove('chat-fullscreen');
            window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
                detail: { paneId: id, isFullscreen: false }
            }));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Fullscreen: ESC to exit
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isFullscreen]);

    // Parse command intents
    const parseIntent = useCallback((text: string): { type: 'navigate' | 'search' | 'global_search' | 'chat', target?: string } => {
        const lower = text.toLowerCase();

        // Global Documents Request
        if (lower.includes('alle dokumente') || lower.includes('alle dateien') || lower.includes('all documents') || lower.includes('everything')) {
            return { type: 'global_search' };
        }

        // Navigation commands
        if (lower.includes('zeig') || lower.includes('zeige') || lower.includes('show') || lower.includes('geh zu') || lower.includes('go to')) {
            // Find department name
            for (const dept of departments) {
                if (lower.includes(dept.name.toLowerCase())) {
                    return { type: 'navigate', target: dept.id };
                }
            }
        }

        // Search commands
        if (lower.includes('find') || lower.includes('such') || lower.includes('search') || lower.includes('oeffne') || lower.includes('öffne')) {
            // Priority regex for German/English search verbs
            const target = text
                .replace(/^(zeige mir|zeig mir|zeige|zeig|oeffne|öffne|finde|find|suche|such|search|suche nach|search for|suche mir|find me)\s+/i, '')
                .replace(/\s+(dokumente|dokument|documents|document|dateien|datei|files|file|ordner|folder|folders)$/i, '')
                .trim();
            return { type: 'search', target };
        }

        return { type: 'chat' };
    }, [departments]);

    // Execute navigation
    const executeNavigation = useCallback((deptId: string) => {
        const dept = safeDepartments.find(d => d.id === deptId);
        if (dept) {
            dispatchMoraPresence({
                action: 'navigate',
                targetId: deptId,
                targetType: 'department',
                message: `Navigiere zu ${dept.name}`,
                source: 'ai',
            });
            useNavStore.getState().navigateToDepartment(deptId);

            return `✨ Ich navigiere zu **${dept.name}**! Schau auf die Planeten links.`;
        }
        return 'Department nicht gefunden.';
    }, [safeDepartments]);

    // Execute search
    const executeSearch = useCallback((query: string, global: boolean = false) => {
        openPane({
            id: 'finder-main',
            type: 'finder',
            title: global ? 'Saimôr Mycelium (Alle Daten)' : `Finder: ${query}`,
            size: { width: 1280, height: 820 },
            data: { query, globalSearch: global, companyId: activeCompanyId || undefined }
        });
        dispatchNavigationResult({
            title: global ? 'Unternehmenssuche geoeffnet' : 'Suche geoeffnet',
            message: global
                ? 'Ich habe die organisationsweite Suche im aktuellen Organisationskontext geoeffnet.'
                : `Ich habe die Suche fuer ${query} im aktuellen Organisationskontext geoeffnet.`,
            targetType: 'search',
            label: query || 'Alle Dokumente',
            query: query || '',
            companyId: activeCompanyId || undefined,
            source: 'chat',
        });
        return global
            ? `🌐 Ich öffne das gesamte **Saimôr Mycelium**. Hier findest du alle Dokumente des Unternehmens.`
            : `🔍 Ich öffne die Suche für **"${query}"**...`;
    }, [activeCompanyId, openPane]);

    const executeDirectOpenIntent = useCallback(async (query: string) => {
        const trimmed = query.trim();
        if (!activeCompanyId) {
            return executeSearch(trimmed);
        }
        setOpenIntentReceipt(null);

        const scope = {
            companyId: activeCompanyId,
            departmentId: activeDepartmentId,
            spaceId: activeSpaceId,
            folderId: activeFolderId,
        };
        const openIntent = await resolveOpenIntent({
            query: trimmed,
            company_id: activeCompanyId,
            department_id: activeDepartmentId,
            space_id: activeSpaceId,
            folder_id: activeFolderId,
        });

        if (openIntent.resolution === 'choose' && openIntent.candidates.length > 0) {
            dispatchNavigationResult({
                title: 'Mehrdeutiger Treffer',
                message: openIntent.open_explanation?.reason || openIntent.reason || `Mehrere passende Treffer fuer ${trimmed}. Waehle unten einen aus.`,
                targetType: 'search',
                label: trimmed,
                query: trimmed,
                companyId: activeCompanyId || undefined,
                source: 'chat',
            });
            setAmbiguityChoice({
                query: trimmed,
                results: openIntent.candidates.map((candidate) => toChatOpenableResult(candidate)),
                receipt: buildOpenIntentReceipt(openIntent, trimmed),
            });
            return `Ich sehe mehrere passende Treffer fuer **${trimmed}**. Waehle unten einen aus.`;
        }

        if (openIntent.resolution === 'none' || !openIntent.chosen) {
            openPane({
                id: 'search-main',
                type: 'search',
                title: 'Suche',
                size: { width: 960, height: 720 },
                data: { query: trimmed },
            });
            dispatchNavigationResult({
                title: 'Suche geoeffnet',
                message: openIntent.open_explanation?.reason || openIntent.reason || `Ich habe keinen klaren Treffer fuer ${trimmed} gefunden und die Suche geoeffnet.`,
                targetType: 'search',
                label: trimmed,
                query: trimmed,
                companyId: activeCompanyId || undefined,
                source: 'chat',
            });
            setOpenIntentReceipt({
                query: trimmed,
                receipt: buildOpenIntentReceipt(openIntent, trimmed),
            });
            return `Ich finde dazu keinen klaren Treffer. Ich habe die Suche fuer **${trimmed}** geoeffnet.`;
        }

        const chosen = toChatOpenableResult(openIntent.chosen);
        setAmbiguityChoice(null);
        setOpenIntentReceipt(null);
        await openSearchResult(chosen, openPane, scope, 'chat');
        if (chosen.type === 'file' || chosen.type === 'node') {
            return `Ich oeffne **${chosen.title}** direkt im passenden Finder-Kontext.`;
        }
        return `Ich oeffne **${chosen.title}** im aktuellen Organisationskontext.`;
    }, [activeCompanyId, activeDepartmentId, activeFolderId, activeSpaceId, executeSearch, openPane]);

    // Process message content (used by both sendMessage and initial message handler)
    const processMessage = useCallback(async (content: string) => {
        setIsLoading(true);
        setAmbiguityChoice(null);
        setOpenIntentReceipt(null);
        const intent = parseIntent(content);

        // Check for memory intent (e.g., "merke dir...", "wichtig...")
        if (detectMemoryIntent(content)) {
            const insightContent = extractInsightFromRequest(content);
            if (insightContent.length > 5) {
                setMemoryHint({ show: true, content: insightContent });
            }
        }

        // Fetch relevant memories for context (debounced — don't block stream start)
        const memSearchTimer = setTimeout(() => { void fetchRelevantMemories(content); }, 500);

        let responseContent = '';

        try {
            if (intent.type === 'navigate' && intent.target) {
                responseContent = executeNavigation(intent.target);
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                }]);
                setIsLoading(false);
                return;
            } else if (intent.type === 'global_search') {
                responseContent = executeSearch('', true);
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                }]);
                setIsLoading(false);
                return;
            } else if (intent.type === 'search' && intent.target) {
                responseContent = await executeDirectOpenIntent(intent.target);
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                }]);
                setIsLoading(false);
                return;
            } else {
                if ((isLikelyFileOperationIntent(content) || shouldPreferAgenticLoop(content) || Boolean(activePlanId)) && activeCompanyId) {
                    const activeContext = activeFolderId
                        ? { entityId: activeFolderId, entityType: 'folder' as const }
                        : activeSpaceId
                            ? { entityId: activeSpaceId, entityType: 'space' as const }
                            : activeDepartmentId
                                ? { entityId: activeDepartmentId, entityType: 'department' as const }
                                : { entityId: undefined, entityType: undefined };

                    const agentResponse = await executeAgenticLoop(
                        content,
                        {
                            level: viewLevel,
                            entityId: activeContext.entityId,
                            entityType: activeContext.entityType,
                            companyId: activeCompanyId || undefined,
                        },
                        activePlanId ? {
                            planId: activePlanId,
                            sessionId: activeSessionId || undefined,
                        } : undefined,
                    );

                    if (agentResponse?.final_state === 'S4_CONFIRM') {
                        const confirm = agentResponse.pending_confirmations[0];
                        if (confirm) {
                            setMessages(prev => [...prev, {
                                id: crypto.randomUUID(),
                                role: 'assistant',
                                content: agentResponse.final_message || `Ich habe einen Aktionsplan fuer ${confirm.tool_name} vorbereitet. Bitte bestaetige ihn.`,
                                timestamp: new Date(),
                                pendingAction: {
                                    tool_name: confirm.tool_name,
                                    params: confirm.tool_params,
                                    risk_level: confirm.risk_level,
                                    confirmation_token: confirm.confirmation_token || "",
                                    action_id: confirm.action_id || `trace-${Date.now()}`,
                                }
                            }]);
                            setIsLoading(false);
                            return;
                        }
                    }

                    if (agentResponse?.final_message) {
                        const planId = extractPlanId(agentResponse) ?? undefined;
                        if (planId) {
                            try {
                                const plan = await fetchWorkSessionPlan(planId);
                                if (plan) {
                                    setActiveSession({ planId: plan.plan_id, sessionId: plan.session_id });
                                    setActiveSessionTitle(plan.title);
                                    setActiveSessionState(plan.state);
                                    dispatchWorkSessionPlan({
                                        planId: plan.plan_id,
                                        sessionId: plan.session_id,
                                        source: 'chat',
                                        state: plan.state,
                                        title: plan.title,
                                        summary: plan.summary,
                                        mode: plan.mode,
                                        scope: plan.scope,
                                        stats: plan.stats,
                                        transparencyNote: plan.transparency_note,
                                        running_step_title:
                                            plan.state === 'running'
                                                ? plan.execution?.current_step_title
                                                : undefined,
                                        pending_confirmation_title:
                                            plan.state === 'waiting_confirmation'
                                                ? plan.execution?.pending_confirmation_title
                                                : undefined,
                                        next_label:   plan.execution?.next_label,
                                        next_message: plan.execution?.last_transition_message ?? plan.execution?.next_message,
                                        last_transition_step_id: plan.execution?.last_transition_step_id,
                                        last_transition_type: plan.execution?.last_transition_type,
                                        last_transition_message: plan.execution?.last_transition_message,
                                    });
                                } else {
                                    setActiveSession({ planId, sessionId: agentResponse.work_session_plan?.session_id });
                                    setActiveSessionTitle(agentResponse.work_session_plan?.title ?? null);
                                    setActiveSessionState(agentResponse.work_session_plan?.state ?? 'pending');
                                    dispatchWorkSessionPlan({
                                        planId,
                                        source: 'chat',
                                        state: agentResponse.work_session_plan?.state ?? 'pending',
                                        title: agentResponse.work_session_plan?.title || 'Arbeitsplan',
                                        summary: agentResponse.work_session_plan?.summary || agentResponse.final_message,
                                        stats: agentResponse.work_session_plan?.stats as any,
                                        running_step_title:
                                            agentResponse.work_session_plan?.state === 'running'
                                                ? (agentResponse.work_session_plan as any)?.execution?.current_step_title
                                                : undefined,
                                        pending_confirmation_title:
                                            agentResponse.work_session_plan?.state === 'waiting_confirmation'
                                                ? (agentResponse.work_session_plan as any)?.execution?.pending_confirmation_title
                                                : undefined,
                                        next_label:   (agentResponse.work_session_plan as any)?.execution?.next_label,
                                        next_message:
                                            (agentResponse.work_session_plan as any)?.execution?.last_transition_message
                                            ?? (agentResponse.work_session_plan as any)?.execution?.next_message,
                                        last_transition_step_id:
                                            (agentResponse.work_session_plan as any)?.execution?.last_transition_step_id,
                                        last_transition_type:
                                            (agentResponse.work_session_plan as any)?.execution?.last_transition_type,
                                        last_transition_message:
                                            (agentResponse.work_session_plan as any)?.execution?.last_transition_message,
                                    });
                                }
                            } catch {
                                setActiveSession({ planId, sessionId: agentResponse.work_session_plan?.session_id });
                                setActiveSessionTitle(agentResponse.work_session_plan?.title ?? null);
                                setActiveSessionState(agentResponse.work_session_plan?.state ?? 'pending');
                                dispatchWorkSessionPlan({
                                    planId,
                                    source: 'chat',
                                    state: agentResponse.work_session_plan?.state ?? 'pending',
                                    title: agentResponse.work_session_plan?.title || 'Arbeitsplan',
                                    summary: agentResponse.work_session_plan?.summary || agentResponse.final_message,
                                    stats: agentResponse.work_session_plan?.stats as any,
                                    running_step_title:
                                        agentResponse.work_session_plan?.state === 'running'
                                            ? (agentResponse.work_session_plan as any)?.execution?.current_step_title
                                            : undefined,
                                    pending_confirmation_title:
                                        agentResponse.work_session_plan?.state === 'waiting_confirmation'
                                            ? (agentResponse.work_session_plan as any)?.execution?.pending_confirmation_title
                                            : undefined,
                                    next_label:   (agentResponse.work_session_plan as any)?.execution?.next_label,
                                    next_message:
                                        (agentResponse.work_session_plan as any)?.execution?.last_transition_message
                                        ?? (agentResponse.work_session_plan as any)?.execution?.next_message,
                                    last_transition_step_id:
                                        (agentResponse.work_session_plan as any)?.execution?.last_transition_step_id,
                                    last_transition_type:
                                        (agentResponse.work_session_plan as any)?.execution?.last_transition_type,
                                    last_transition_message:
                                        (agentResponse.work_session_plan as any)?.execution?.last_transition_message,
                                });
                            }
                        }
                        setMessages(prev => [...prev, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: agentResponse.final_message,
                            timestamp: new Date(),
                            planId,
                        }]);
                        setIsLoading(false);
                        return;
                    }
                }

                // ?? STREAMING AI RESPONSE ??????????????????????????????????
                setIsLoading(false); // spinner off — streaming indicator takes over
                const historyForStream = messages
                    .filter(m => m.id !== 'welcome')
                    .slice(-10)
                    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

                const fullReply = await streamSend(content, {
                    history: historyForStream,
                    context: buildChatContext({
                        session_id: "chat_pane",
                        pane_id: id,
                    }) as Record<string, unknown> | undefined
                });

                // After stream done — add finalized message to local list
                // (streamingText already shown live; now commit it)
                if (fullReply) {
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: fullReply,
                        timestamp: new Date(),
                    }]);
                } else if (streamError) {
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `⚠️ Fehler: ${streamError}`,
                        timestamp: new Date(),
                    }]);
                }
                return;
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Es gab einen Fehler. Bitte versuche es erneut.',
                timestamp: new Date()
            }]);
        } finally {
            // Ensure isLoading is always cleared (noop if streaming path already cleared it)
            setIsLoading(false);
        }
        // Cancel memSearch if it hasn't fired yet — not possible with simple setTimeout
        // (fire-and-forget is fine for memory hints)
    }, [
        activeCompanyId,
        activeDepartmentId,
        activeFolderId,
        activePlanId,
        activeSessionId,
        activeSpaceId,
        executeDirectOpenIntent,
        executeNavigation,
        executeSearch,
        fetchRelevantMemories,
        id,
        messages,
        parseIntent,
        setActiveSession,
        streamError,
        streamSend,
        viewLevel,
    ]);

    // Handle initial message from Dock/Spotlight chat input
    useEffect(() => {
        if (pane?.data?.initialMessage && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;
            const initialMsg = pane.data.initialMessage;

            // Set input as visual feedback
            setInput(initialMsg);

            const timer = window.setTimeout(() => {
                const userMessage: Message = {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: initialMsg,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, userMessage]);
                setInput('');
                void processMessage(userMessage.content);
            }, 300);

            return () => window.clearTimeout(timer);
        }
    }, [pane?.data?.initialMessage, pane?.id, processMessage]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        await processMessage(userMessage.content);
    };

    if (!pane) return null;

    // ── Fullscreen wrapper ───────────────────────────────────────────────────
    const chatInner = (
        <div className={`flex flex-col ${isFullscreen ? 'h-full' : 'h-full'}`}>
            {/* Header */}
            <div className={`flex items-center gap-3 p-4 border-b ${isStandardMode ? 'border-[#E1E1E1]' : 'border-white/10'
                }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isStandardMode
                    ? 'bg-[#0078D4]'
                    : 'bg-gradient-to-br from-emerald-400 to-cyan-500'
                    }`}>
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className={`font-medium ${isStandardMode ? 'text-[#1F1F1F]' : 'text-white'
                        }`}>Môra</h3>
                    <p className={`text-xs ${isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                        }`}>Deine KI-Begleiterin</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <MoraContextChip variant="compact" snapshot={moraCtx} />
                    {/* Fullscreen toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                        title={isFullscreen ? 'Normalmodus (Esc)' : 'Vollbild'}
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>
            {/* Relevant Memories Context */}
            <AnimatePresence>
                {showMemories && (relevantMemories.length > 0 || (moraCtx.lastAnswerSource === 'memory' && memoryBasisCompanyId === activeCompanyId)) ? (
                    <RelevantMemories
                        memories={relevantMemories}
                        isMemoryBasis={moraCtx.lastAnswerSource === 'memory'}
                        onOpenMemory={() => openMoraCenter(openPane, 'memory', { width: 640, height: 540 })}
                        onDismiss={() => setShowMemories(false)}
                    />
                ) : null}
            </AnimatePresence>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 ${isFullscreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] ${isFullscreen ? 'px-6 py-4' : 'px-4 py-3'} ${isStandardMode
                                ? msg.role === 'user'
                                    ? 'bg-[#E5F3FF] border border-[#0078D4]/30 text-[#1F1F1F] rounded-lg'
                                    : 'bg-gray-50 border border-gray-200 text-[#1F1F1F] rounded-lg'
                                : msg.role === 'user'
                                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-white rounded-2xl'
                                    : 'bg-white/5 border border-white/10 text-white/90 rounded-2xl'
                                }`}>
                                <div className="flex items-start gap-2">
                                    {msg.role === 'assistant' && (
                                        <Bot size={16} className={`mt-0.5 shrink-0 ${isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                            }`} />
                                    )}
                                    <div
                                        className={`${isFullscreen ? 'text-base' : 'text-sm'} leading-relaxed max-w-none`}
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                    />
                                    {msg.role === 'user' && (
                                        <User size={16} className={`mt-0.5 shrink-0 ${isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                            }`} />
                                    )}
                                </div>
                                <div className={`flex items-center text-[10px] mt-2 ${isStandardMode ? 'text-gray-400' : 'text-white/30'
                                    }`}>
                                    <span>{msg.timestamp.toLocaleTimeString()}</span>
                                    {/* Save as Insight Button - only for assistant messages (not welcome) */}
                                    {msg.role === 'assistant' && msg.id !== 'welcome' && (
                                        <SaveInsightButton
                                            content={msg.content}
                                            companyId={activeCompanyId || undefined}
                                            onSaved={() => markMessageAsSaved(msg.id)}
                                            isSaved={msg.savedAsInsight || false}
                                        />
                                    )}
                                    {/* Scope indicator -- spec Section 5: Memory Scope Visibility Rule */}
                                    {msg.role === 'assistant' && (
                                        <MoraContextLabel {...derivedScope} />
                                    )}
                                </div>
                                {msg.planId && (
                                    <button
                                        type="button"
                                        onClick={() => openPane({
                                            id: `work-session-${msg.planId}`,
                                            type: 'work-session',
                                            title: 'Arbeitsplan',
                                            size: { width: 480, height: 640 },
                                            data: { plan_id: msg.planId },
                                        })}
                                        className={`mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                                            isStandardMode
                                                ? 'border-[#0078D4]/25 bg-[#0078D4]/[0.05] text-[#0078D4]/80 hover:border-[#0078D4]/40 hover:bg-[#0078D4]/[0.1]'
                                                : 'border-cyan-400/20 bg-cyan-500/[0.06] text-cyan-200/65 hover:border-cyan-400/35 hover:bg-cyan-500/[0.12] hover:text-cyan-200'
                                        }`}
                                    >
                                        {msg.planId === activePlanId && (
                                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                            </span>
                                        )}
                                        <LayoutList size={11} />
                                        Plan anzeigen
                                    </button>
                                )}
                                {msg.pendingAction && (
                                    <div className="mt-3">
                                        <ConfirmationCard
                                            action={msg.pendingAction}
                                            onConfirmed={(result) => {
                                                setMessages(prev => prev.map((entry) => (
                                                    entry.id === msg.id
                                                        ? { ...entry, pendingAction: undefined }
                                                        : entry
                                                )));
                                                const _toolName = msg.pendingAction?.tool_name || '';
                                                const _destSummary =
                                                    result?.destination_summary ||
                                                    result?.result?.destination_summary;
                                                // content_change.summary is the semantic description from Core 6b1b301
                                                const _changeSummary =
                                                    result?.change_summary ||
                                                    result?.result?.change_summary ||
                                                    result?.content_change?.summary ||
                                                    result?.result?.content_change?.summary;
                                                const summary =
                                                    _changeSummary ||
                                                    result?.result_summary ||
                                                    result?.result?.result_summary ||
                                                    result?.summary ||
                                                    result?.result?.summary ||
                                                    (_destSummary
                                                        ? _toolName === 'update_note_content'
                                                            ? `Inhalt aktualisiert in ${_destSummary}.`
                                                            : `Erstellt in ${_destSummary}.`
                                                        : null) ||
                                                    (_toolName === 'update_note_content'
                                                        ? 'Inhalt erfolgreich aktualisiert.'
                                                        : 'Aktion erfolgreich ausgeführt.');
                                                setMessages(prev => [...prev, {
                                                    id: crypto.randomUUID(),
                                                    role: 'assistant',
                                                    content: summary,
                                                    timestamp: new Date(),
                                                }]);
                                            }}
                                            onRejected={() => {
                                                setMessages(prev => prev.map((entry) => (
                                                    entry.id === msg.id
                                                        ? { ...entry, pendingAction: undefined }
                                                        : entry
                                                )));
                                                setMessages(prev => [...prev, {
                                                    id: crypto.randomUUID(),
                                                    role: 'assistant',
                                                    content: 'Aktion verworfen.',
                                                    timestamp: new Date(),
                                                }]);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Live streaming bubble — shown while Mora is generating */}
                <AnimatePresence>
                    {isStreaming && streamingText && (
                        <motion.div
                            key="stream-bubble"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[80%] px-4 py-3 bg-white/5 border border-white/10 text-white/90 rounded-2xl">
                                <div className="flex items-start gap-2">
                                    <Bot size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                                    <div
                                        className="text-sm leading-relaxed max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: renderMarkdown(streamingText) +
                                                '<span style="display:inline-block;width:2px;height:1em;background:#34d399;vertical-align:middle;margin-left:2px" class="animate-pulse"></span>'
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {ambiguityChoice && (
                        <motion.div
                            key={`ambiguity-${ambiguityChoice.query}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[80%] w-full">
                                <AmbiguityChoiceSurface
                                    query={ambiguityChoice.query}
                                    results={ambiguityChoice.results}
                                    label={ambiguityChoice.receipt.label}
                                    body={ambiguityChoice.receipt.title}
                                    description={ambiguityChoice.receipt.body}
                                    chips={ambiguityChoice.receipt.chips}
                                    footer={ambiguityChoice.receipt.footer}
                                    onPick={async (result) => {
                                        setAmbiguityChoice(null);
                                        const scope = {
                                            companyId: activeCompanyId,
                                            departmentId: activeDepartmentId,
                                            spaceId: activeSpaceId,
                                            folderId: activeFolderId,
                                        };
                                        await openSearchResult(result, openPane, scope, 'chat');
                                    }}
                                    onReview={() => {
                                        setAmbiguityChoice(null);
                                        openPane({
                                            id: 'search-main',
                                            type: 'search',
                                            title: 'Suche',
                                            size: { width: 960, height: 720 },
                                            data: { query: ambiguityChoice.query },
                                        });
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {openIntentReceipt && (
                        <motion.div
                            key={`open-intent-receipt-${openIntentReceipt.query}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[80%] w-full">
                                <CommandReceipt
                                    tone="slate"
                                    label={openIntentReceipt.receipt.label}
                                    title={openIntentReceipt.receipt.title}
                                    body={openIntentReceipt.receipt.body}
                                    chips={openIntentReceipt.receipt.chips}
                                    footer={openIntentReceipt.receipt.footer}
                                    actions={
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const query = openIntentReceipt.query;
                                                setOpenIntentReceipt(null);
                                                openPane({
                                                    id: 'search-main',
                                                    type: 'search',
                                                    title: 'Suche',
                                                    size: { width: 960, height: 720 },
                                                    data: { query },
                                                });
                                            }}
                                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                                        >
                                            Suche pruefen
                                        </button>
                                    }
                                    className="rounded-[22px]"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Spinner shown only for navigation/search intents (no stream needed) */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                            <span className="text-sm text-white/60">Môra denkt nach...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {moraCtx.isOperational !== null && (
                moraCtx.isOperational ? (
                    <div className="p-4 border-t border-white/10 space-y-2">
                        {/* Memory Hint - shown when user types "merke dir..." etc. */}
                        <AnimatePresence>
                            {memoryHint.show && (
                                <MemoryHint
                                    onConfirm={handleMemoryConfirm}
                                    onDismiss={() => setMemoryHint({ show: false, content: '' })}
                                />
                            )}
                        </AnimatePresence>

                        {activePlanId && activeSessionTitle && (() => {
                            const isRunning = activeSessionState === 'running';
                            const isWaiting = activeSessionState === 'waiting_confirmation';
                            const isDone = activeSessionState === 'done';
                            const dotClass = isRunning
                                ? 'bg-blue-400/70'
                                : isWaiting
                                    ? 'bg-amber-400/80'
                                    : isDone
                                        ? 'bg-white/20'
                                        : 'bg-violet-400/70';
                            const textClass = isRunning
                                ? 'text-blue-300/60'
                                : isWaiting
                                    ? 'text-amber-300/65'
                                    : isDone
                                        ? 'text-white/28'
                                        : 'text-violet-300/60';
                            const stateWord = isRunning
                                ? 'Laeuft'
                                : isWaiting
                                    ? 'Wartet'
                                    : isDone
                                        ? 'Abgeschlossen'
                                        : 'Aktiver Plan';

                            return (
                                <div className="mb-1.5 flex items-center gap-1.5 px-1">
                                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
                                    <span className={`truncate text-[10px] ${textClass}`}>
                                        {stateWord}: {activeSessionTitle}
                                    </span>
                                </div>
                            );
                        })()}

                        <div className={`flex gap-2 ${isFullscreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isStreaming) sendMessage();
                                    if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
                                }}
                                placeholder="Schreib Mora... (z.B. 'Merke dir...')"
                                autoFocus={isFullscreen}
                                disabled={isStreaming}
                                className={`flex-1 bg-black/40 border border-emerald-500/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all disabled:opacity-50 ${isFullscreen ? 'text-base' : 'text-sm'}`}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading || isStreaming}
                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 rounded-xl text-black font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {isFullscreen && <span>Senden</span>}
                            </button>
                        </div>
                        {isFullscreen ? (
                            <div className="max-w-4xl mx-auto w-full">
                                <ChatSuggestions onSelect={setInput} />
                            </div>
                        ) : (
                            <ChatSuggestions onSelect={setInput} />
                        )}
                    </div>
                ) : (
                    <SetupRequiredCard
                        onOpenSettings={() => {
                            openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } });
                        }}
                    />
                )
            )}
        </div>
    );

    if (isFullscreen) {
        return (
            <motion.div
                key="chat-fullscreen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9000] flex flex-col glass-panel border-none rounded-none"
                style={{ paddingBottom: '0' }}
            >
                {chatInner}
            </motion.div>
        );
    }

    return (
        <GlassPanel
            title="Chat mit Môra"
            width={pane.size.width}
            height={pane.size.height}
            minWidth={560}
            minHeight={420}
            padding={0}
            initialX={pane.position.x}
            initialY={pane.position.y}
            paneId={id}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showMaximizeButton
            draggable
            resizable
        >
            {chatInner}
        </GlassPanel>
    );
}




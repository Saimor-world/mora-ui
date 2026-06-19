'use client';

/**
 * ChatApp - Mora AI Conversation Interface (App Module)
 *
 * MASTERBIBEL: Môra is your Disney fairy AI companion.
 * This app allows direct conversation with Môra (via Ollama/Gemini/etc).
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
import { GLASS_SHEET_PRESENTATION } from '@/lib/os/glassSheet';
import { usePaneStore } from '@/lib/store/paneStore';
import { isLikelyFileOperationIntent, shouldPreferAgenticLoop } from '@/lib/chat/intent';
import { renderMarkdown, normalizeAgentResponse, extractPlanId } from '@/lib/chat/format';
import { toToolTrace, type ToolTraceStep } from '@/lib/chat/toolTrace';
import { ToolTrace } from '@/components/chat/ToolTrace';
import { buildOpenIntentReceipt, toChatOpenableResult } from '@/lib/chat/openIntent';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { learnInsight, searchMemory } from '@/lib/api/coreClient';
import { buildChatContext } from '@/lib/api/moraAgentClient';
import { useMoraPerception } from '@/lib/queries/useMoraPerception';
import { isMoraPerceiveV1Enabled } from '@/lib/featureFlags';
import { parseAIResponse, executeCursorCommands } from '@/lib/ai/cursorBridge';
import { useMoraStream } from '@/lib/hooks/useMoraStream';
import { useMoraFrameStream } from '@/lib/hooks/useMoraFrameStream';
import { FramedMessage } from '@/components/mora/dialogue/FramedMessage';
import { isMoraDialogueV1Enabled } from '@/lib/featureFlags';
import type { MoraFrame } from '@/lib/types/moraFrame';
import { executeAgenticLoop } from '@/lib/api/cognitionClient';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { Send, Sparkles, Loader2, Bot, User, Brain, BookmarkPlus, Lightbulb, Check, Maximize2, Minimize2, LayoutList, WifiOff, RefreshCw } from 'lucide-react';
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import type { MemoryCategory, MemorySearchResult } from '@/lib/types/memory';
import { dispatchNavigationResult, openSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import { fetchWorkSessionPlan, resolveOpenIntent } from '@/lib/api/coreClient';
import { dispatchWorkSessionPlan, WORK_SESSION_PLAN_EVENT, type WorkSessionShellSummary } from '@/lib/utils/moraExplanation';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { MoraContextLabel, type MoraScope } from '@/components/mora/MoraContextLabel';
import { openMoraCenter } from '@/lib/utils/openMoraCenter';
import { detectMemoryIntent, detectRecallIntent, extractInsightFromRequest } from '@/lib/chat/memoryIntent';
import type { AppProps } from '@/lib/apps/types';
import { getUserColorHex } from '@/lib/utils/userColors';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { buildCommunicationOperationalContextMessage, useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
// Sprint 3: Mora episodic memory hooks
import { fetchMoraMemories, type MoraMemory } from '@/lib/api/memoryClient';
import { MemoriesView } from './components/MemoriesView';
import { SaveInsightButton, MemoryHint, RelevantMemories } from './components/MemoryComponents';
import { SetupRequiredCard, InputLoadingPlaceholder, OfflineCard, ChatSuggestions, ChatSuggestionsMemo } from './components/ChatStatusCards';

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
    /** typed frames from mora.dialogue.v1 path — rendered via FramedMessage */
    frames?: MoraFrame[];
    /** Sprint 3: IDs of mora_memories recalled for this response */
    recalledMemoryIds?: string[];
    /** Phase 1 "visible agency": safe trace of what Mora did (searched/read/acted) */
    toolTrace?: ToolTraceStep[];
}



// Extracted memory components to components/MemoryComponents.tsx and components/ChatStatusCards.tsx

// =============================================================================
// Sprint 3: MemoriesView — episodic memory browser with semantic search
// =============================================================================

// Extracted MemoriesView component to components/MemoriesView.tsx

export default function ChatApp({ paneId, initialData }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const isActive = usePaneStore(s => s.activePaneId === paneId);
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
        activeMode,
    } = useNavStore();
    const { data: departments } = useDepartments(activeCompanyId);
    const pane = getPane(paneId);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const user = useSessionStore(state => state.user);
    const userAura = useMemo(() => {
        const u = user as any;
        if (u?.role === 'owner' || u?.role === 'system_owner') return '#d4af37';
        return getUserColorHex(u?.email || u?.name || '');
    }, [user]);

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

    // Streaming hook — real AI, token-by-token (legacy free-text path)
    const {
        sendMessage: streamSend,
        streamingText,
        isStreaming,
        error: streamError,
        messages: streamHistory,
        clearHistory,
    } = useMoraStream();

    // Typed-frame stream — mora.dialogue.v1 path (spec §4).
    // Always called (hooks must not be conditional); only used when flag is on.
    const {
        send: frameSend,
        frames: liveFrames,
        isStreaming: isFrameStreaming,
        error: frameError,
        reset: frameReset,
    } = useMoraFrameStream();

    const useFramePath = isMoraDialogueV1Enabled();
    const { mailPreview, calendarPreview, feedPreview, cloudPreview } = useCommunicationLiveData();
    const { overview: communicationOverview, summary: communicationSummary } = useCommunicationSurface();

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
- **"Was läuft in ${d2}?"** → ich suche in Inhalten und Aktivität
- **"Merke dir ..."** → ich speichere belastbare Fakten für später

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
    const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);
    const [memoryHint, setMemoryHint] = useState<{ show: boolean; content: string }>({ show: false, content: '' });
    const [relevantMemories, setRelevantMemories] = useState<MemorySearchResult[]>([]);
    const [showMemories, setShowMemories] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Sprint 3: tab state for chat vs. memories view
    const [chatView, setChatView] = useState<'chat' | 'memories'>('chat');
    const [memoriesSearchQuery, setMemoriesSearchQuery] = useState('');
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

    // Real Mora P1: when the perceive flag is on, fetch the bundle keyed on
    // current scope so the LLM gets fresh perception each turn. The hook is
    // called unconditionally; when the flag is off the bundle is unused.
    const { data: perceptionBundle } = useMoraPerception({
        active_pane: {
            type: pane?.type ?? 'chat',
            data: {
                department_id: activeDepartmentId ?? undefined,
                space_id: activeSpaceId ?? undefined,
                folder_id: activeFolderId ?? undefined,
            },
        },
    }, { enabled: activeMode !== 'visitor' });

    const communicationContextMessage = useMemo(
        () => buildCommunicationOperationalContextMessage(
            communicationSummary,
            communicationOverview,
            mailPreview,
            calendarPreview,
            feedPreview,
            cloudPreview,
        ),
        [calendarPreview, cloudPreview, communicationOverview, communicationSummary, feedPreview, mailPreview]
    );
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
            console.warn('[ChatApp] Memory search failed:', err);
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
        const savedContent = memoryHint.content; // capture before clearing
        setMemoryHint({ show: false, content: '' });
        try {
            await learnInsight({
                insight: savedContent,
                category: 'context',
                auto_commit: true,
                company_id: activeCompanyId
            });
            // Bestätigung im Chat anzeigen
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant' as const,
                    content: `✓ Gespeichert [👤 Persönlich]: „${savedContent}"`,
                    timestamp: new Date(),
                },
            ]);
        } catch (err) {
            console.error('[ChatApp] Failed to save memory:', err);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant' as const,
                    content: 'Ich konnte das leider nicht speichern. Versuch es nochmal.',
                    timestamp: new Date(),
                },
            ]);
        }
    }, [memoryHint.content, activeCompanyId]);

    // Auto-scroll to bottom when messages or streaming text changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    // Sprint 2: listen for proactive Mora speaks (urgent KAIROS signals)
    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (!detail?.message) return;
            setMessages(prev => [...prev, {
                id: `speak-${detail.id}`,
                role: 'assistant',
                content: detail.message,
                timestamp: new Date(),
            }]);
        };
        window.addEventListener('mora-speaks-message', handler as EventListener);
        return () => window.removeEventListener('mora-speaks-message', handler as EventListener);
    }, []);

    // Bootstrap timeout: if isOperational stays null >7s, backend is likely down
    useEffect(() => {
        if (moraCtx.isOperational !== null) {
            setBootstrapTimedOut(false);
            return;
        }
        const timer = window.setTimeout(() => setBootstrapTimedOut(true), 7000);
        return () => window.clearTimeout(timer);
    }, [moraCtx.isOperational]);

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
            detail: { paneId: paneId, isFullscreen }
        }));
    }, [isFullscreen, paneId]);

    // Fullscreen: cleanup on unmount (or paneId change) — signal MoraShell to remove this pane from fullscreen set.
    // Always dispatches isFullscreen: false — intentional stale closure; [paneId] dep only.
    useEffect(() => {
        return () => {
            document.body.classList.remove('chat-fullscreen');
            window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
                detail: { paneId: paneId, isFullscreen: false }
            }));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paneId]);

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
            for (const dept of safeDepartments) {
                if (lower.includes(dept.name.toLowerCase())) {
                    return { type: 'navigate', target: dept.id };
                }
            }
            const target = text
                .replace(/^(zeige mir|zeig mir|zeige|zeig|go to|geh zu|show me|show)\s+/i, '')
                .replace(/\s+(dokumente|dokument|documents|document|dateien|datei|files|file|ordner|folder|folders)$/i, '')
                .trim();
            if (target) {
                return { type: 'search', target };
            }
        }

        // Search commands
        if (lower.includes('find') || lower.includes('such') || lower.includes('search') || lower.includes('öffne') || lower.includes('öffne')) {
            // Priority regex for German/English search verbs
            const target = text
                .replace(/^(zeige mir|zeig mir|zeige|zeig|öffne|öffne|finde|find|suche|such|search|suche nach|search for|suche mir|find me)\s+/i, '')
                .replace(/\s+(dokumente|dokument|documents|document|dateien|datei|files|file|ordner|folder|folders)$/i, '')
                .trim();
            return { type: 'search', target };
        }

        return { type: 'chat' };
    }, [safeDepartments]);

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
            openPane({
                id: 'finder-main',
                type: 'finder',
                title: dept.name,
                data: {
                    departmentId: dept.id,
                    departmentName: dept.name,
                    companyId: activeCompanyId || dept.company_id || undefined,
                    showUpload: true
                },
                size: { width: 1280, height: 820 }
            });

            return `✨ Ich navigiere zu **${dept.name}** und öffne den Finder!`;
        }
        return 'Department nicht gefunden.';
    }, [safeDepartments, activeCompanyId, openPane]);

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
            title: global ? 'Unternehmenssuche geöffnet' : 'Suche geöffnet',
            message: global
                ? 'Ich habe die organisationsweite Suche im aktuellen Organisationskontext geöffnet.'
                : `Ich habe die Suche für ${query} im aktuellen Organisationskontext geöffnet.`,
            targetType: 'search',
            label: query || 'Alle Dokumente',
            query: query || '',
            companyId: activeCompanyId || undefined,
            source: 'chat',
        });
        return global
            ? `� Ich öffne das gesamte **Saimôr Mycelium**. Hier findest du alle Dokumente des Unternehmens.`
            : `� Ich öffne die Suche für **"${query}"**...`;
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
                message: openIntent.open_explanation?.reason || openIntent.reason || `Mehrere passende Treffer für ${trimmed}. Wähle unten einen aus.`,
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
            return `Ich sehe mehrere passende Treffer für **${trimmed}**. Wähle unten einen aus.`;
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
                title: 'Suche geöffnet',
                message: openIntent.open_explanation?.reason || openIntent.reason || `Ich habe keinen klaren Treffer für ${trimmed} gefunden und die Suche geöffnet.`,
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
            return `Ich finde dazu keinen klaren Treffer. Ich habe die Suche für **${trimmed}** geöffnet.`;
        }

        const chosen = toChatOpenableResult(openIntent.chosen);
        setAmbiguityChoice(null);
        setOpenIntentReceipt(null);
        await openSearchResult(chosen, openPane, scope, 'chat');
        if (chosen.type === 'file' || chosen.type === 'node') {
            return `Ich öffne **${chosen.title}** direkt im passenden Finder-Kontext.`;
        }
        return `Ich öffne **${chosen.title}** im aktuellen Organisationskontext.`;
    }, [activeCompanyId, activeDepartmentId, activeFolderId, activeSpaceId, executeSearch, openPane]);

    // Process message content (used by both sendMessage and initial message handler)
    const processMessage = useCallback(async (content: string) => {
        setIsLoading(true);
        setAmbiguityChoice(null);
        setOpenIntentReceipt(null);

        // ── Recall-Intent: direkt aus Memory rendern, kein Agent-Call ──────────────
        if (detectRecallIntent(content)) {
            try {
                const memories = await fetchMoraMemories(20);
                let recallText: string;
                if (!memories || memories.length === 0) {
                    recallText = 'Ich habe noch keine Erinnerungen gespeichert. Wenn du mir sagst "merke dir ...", speichere ich es für später.';
                } else {
                    const lines = memories
                        .slice(0, 10)
                        .map((m) => `• ${m.summary}`)
                        .join('\n');
                    recallText = `Ich erinnere mich an ${memories.length} ${memories.length === 1 ? 'Ding' : 'Dinge'}:\n\n${lines}`;
                }
                setMessages((prev) => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant' as const,
                        content: recallText,
                        timestamp: new Date(),
                    },
                ]);
            } catch {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant' as const,
                        content: 'Ich konnte deine Erinnerungen gerade nicht laden. Versuch es nochmal.',
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
            return; // � kein Agent-Call, kein parseIntent
        }
        // ── Ende Recall-Intent ──────────────────────────────────────────────────────

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
                                content: agentResponse.final_message || `Ich habe einen Aktionsplan für ${confirm.tool_name} vorbereitet. Bitte bestätige ihn.`,
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
                        // Sprint 3: extract recalled_memory_ids from agent response
                        const recalledMemoryIds = (agentResponse as any).recalled_memory_ids as string[] | undefined;
                        setMessages(prev => [...prev, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: agentResponse.final_message,
                            timestamp: new Date(),
                            planId,
                            recalledMemoryIds: recalledMemoryIds && recalledMemoryIds.length > 0 ? recalledMemoryIds : undefined,
                            toolTrace: toToolTrace(agentResponse.tools_executed),
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

                const streamHistoryWithCommunication = communicationContextMessage
                    ? [{ role: 'assistant' as const, content: communicationContextMessage }, ...historyForStream]
                    : historyForStream;

                const chatContext = buildChatContext({
                    session_id: "chat_pane",
                    pane_id: paneId,
                    ...(isMoraPerceiveV1Enabled() && perceptionBundle ? { perception: perceptionBundle } : {}),
                }) as Record<string, unknown> | undefined;

                if (useFramePath) {
                    // mora.dialogue.v1: typed frames via /v3/chat/stream
                    frameReset();
                    await frameSend(content, {
                        history: streamHistoryWithCommunication,
                        context: chatContext,
                    });
                    // After stream done — commit frames as a message
                    const captured = [...liveFrames];
                    if (captured.length > 0) {
                        setMessages(prev => [...prev, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: '',
                            frames: captured,
                            timestamp: new Date(),
                        }]);
                    } else if (frameError) {
                        setMessages(prev => [...prev, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: `Mora konnte nicht antworten – ${frameError}`,
                            timestamp: new Date(),
                        }]);
                    }
                    return;
                }

                // Legacy free-text stream via /v1/chat/stream
                const fullReply = await streamSend(content, {
                    history: streamHistoryWithCommunication,
                    context: chatContext,
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
                    const isConnErr = streamError.toLowerCase().includes('fetch') || streamError.toLowerCase().includes('network') || streamError.toLowerCase().includes('connect');
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: isConnErr
                            ? 'Das Backend ist gerade nicht erreichbar. Stelle sicher, dass CORE läuft, und versuche es erneut.'
                            : `Mora konnte nicht antworten – ${streamError}`,
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
        fetchMoraMemories,
        fetchRelevantMemories,
        paneId,
        messages,
        parseIntent,
        setActiveSession,
        communicationContextMessage,
        streamError,
        streamSend,
        viewLevel,
        perceptionBundle,
        useFramePath,
        frameSend,
        frameReset,
        frameError,
        liveFrames,
    ]);

    // Handle initial message from Dock/Spotlight chat input
    const initialMessage = initialData?.initialMessage as string | undefined;
    useEffect(() => {
        if (initialMessage && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;

            // Set input as visual feedback
            setInput(initialMessage);

            const timer = window.setTimeout(() => {
                const userMessage: Message = {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: initialMessage,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, userMessage]);
                setInput('');
                void processMessage(userMessage.content);
            }, 300);

            return () => window.clearTimeout(timer);
        }
    }, [initialMessage, processMessage]);

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
                    : 'bg-gradient-to-br from-violet-400 to-cyan-500'
                    }`}>
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className={`font-medium ${isStandardMode ? 'text-[#1F1F1F]' : 'text-white'
                        }`}>Môra</h3>
                    <p className={`text-xs ${isStandardMode ? 'text-[#0078D4]' : 'text-violet-400'
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
            {/* Sprint 3: Tab bar — Chat / Erinnerungen */}
            <div className={`flex gap-0 border-b ${isStandardMode ? 'border-[#E1E1E1]' : 'border-white/[0.06]'}`}>
                {(['chat', 'memories'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setChatView(tab)}
                        className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                            chatView === tab
                                ? isStandardMode
                                    ? 'border-[#0078D4] text-[#0078D4]'
                                    : 'border-violet-400 text-white/90'
                                : isStandardMode
                                    ? 'border-transparent text-[#605E5C] hover:text-[#1F1F1F]'
                                    : 'border-transparent text-white/40 hover:text-white/70'
                        }`}
                    >
                        {tab === 'chat' ? 'Chat' : 'Erinnerungen'}
                    </button>
                ))}
            </div>

            {/* Relevant Memories Context */}
            <AnimatePresence>
                {chatView === 'chat' && showMemories && (relevantMemories.length > 0 || (moraCtx.lastAnswerSource === 'memory' && memoryBasisCompanyId === activeCompanyId)) ? (
                    <RelevantMemories
                        memories={relevantMemories}
                        isMemoryBasis={moraCtx.lastAnswerSource === 'memory'}
                        onOpenMemory={() => openMoraCenter(openPane, 'memory', { width: 640, height: 540 })}
                        onDismiss={() => setShowMemories(false)}
                    />
                ) : null}
            </AnimatePresence>

            {/* Sprint 3: Memories tab view */}
            {chatView === 'memories' && (
                <MemoriesView
                    searchQuery={memoriesSearchQuery}
                    onSearchQueryChange={setMemoriesSearchQuery}
                    isStandardMode={isStandardMode}
                />
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 ${isFullscreen ? 'max-w-4xl mx-auto w-full' : ''} ${chatView === 'memories' ? 'hidden' : ''}`}>
                {/* Empty state — shown when no messages yet */}
                {messages.length === 0 && !isStreaming && !isFrameStreaming && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4 py-8 select-none">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                            isStandardMode
                                ? 'bg-[#0078D4]/15 border border-[#0078D4]/25'
                                : 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_24px_rgba(124,58,237,0.08)]'
                        }`}>
                            <Sparkles size={22} className={isStandardMode ? 'text-[#0078D4]' : 'text-violet-400'} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium mb-1 ${isStandardMode ? 'text-[#1F1F1F]' : 'text-white/75'}`}>
                                Hallo, ich bin Môra
                            </p>
                            <p className={`text-xs leading-relaxed max-w-[260px] ${isStandardMode ? 'text-[#605E5C]' : 'text-white/35'}`}>
                                Frag mich etwas, oder lass mich dir beim Durchsuchen, Erstellen und Verstehen deiner Inhalte helfen.
                            </p>
                        </div>
                        {/* Quick prompt suggestions */}
                        <div className="flex flex-wrap gap-2 justify-center max-w-[320px]">
                            {[
                                'Was ist mein letzter Stand?',
                                'Suche nach…',
                                'Erstelle eine Notiz',
                            ].map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => setInput(prompt)}
                                    className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                                        isStandardMode
                                            ? 'border-[#E1E1E1] text-[#605E5C] hover:border-[#0078D4]/40 hover:text-[#0078D4]'
                                            : 'border-white/[0.08] text-white/40 hover:border-violet-400/30 hover:text-white/70 hover:bg-white/[0.03]'
                                    }`}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

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
                                    ? 'border text-[#1F1F1F] rounded-lg'
                                    : 'bg-gray-50 border border-gray-200 text-[#1F1F1F] rounded-lg'
                                : msg.role === 'user'
                                    ? 'border text-white rounded-2xl'
                                    : 'bg-white/5 border border-white/10 text-white/90 rounded-2xl'
                                }`}
                                style={msg.role === 'user' ? (isStandardMode ? {
                                    background: '#E5F3FF',
                                    borderColor: 'rgba(0, 120, 212, 0.188)',
                                } : {
                                    background: `${userAura}1a`,
                                    borderColor: `${userAura}40`,
                                }) : undefined}>
                                {/* Sprint 3: "Mora erinnert sich" recall indicator */}
                                {msg.role === 'assistant' && msg.recalledMemoryIds && msg.recalledMemoryIds.length > 0 && (
                                    <div className="mb-1 inline-flex items-center gap-1 text-[10px] text-violet-300/72">
                                        <Sparkles size={10} />
                                        Mora erinnert sich an {msg.recalledMemoryIds.length} Gespräch{msg.recalledMemoryIds.length !== 1 ? 'e' : ''}
                                    </div>
                                )}
                                <div className="flex items-start gap-2">
                                    {msg.role === 'assistant' && (
                                        <Bot size={16} className={`mt-0.5 shrink-0 ${isStandardMode ? 'text-[#0078D4]' : 'text-violet-400'
                                            }`} />
                                    )}
                                    {msg.frames && msg.frames.length > 0 ? (
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {msg.frames.map((frame, i) => (
                                                <FramedMessage key={i} frame={frame} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={`${isFullscreen ? 'text-base' : 'text-sm'} leading-relaxed max-w-none`}
                                                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                            />
                                            {msg.role === 'assistant' && msg.toolTrace && msg.toolTrace.length > 0 && (
                                                <ToolTrace steps={msg.toolTrace} />
                                            )}
                                        </div>
                                    )}
                                    {msg.role === 'user' && (
                                        <User
                                            size={16}
                                            className="mt-0.5 shrink-0"
                                            style={{ color: isStandardMode ? '#0078D4' : userAura }}
                                        />
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

                {/* Thinking indicator — shown when stream started but no content yet */}
                <AnimatePresence>
                    {((useFramePath && isFrameStreaming && liveFrames.length === 0) ||
                      (!useFramePath && isStreaming && !streamingText)) && (
                        <motion.div
                            key="thinking-indicator"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                            className="flex justify-start"
                        >
                            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 flex items-center gap-3">
                                {/* Animated dots */}
                                <div className="flex items-center gap-1">
                                    {[0, 1, 2].map(i => (
                                        <span
                                            key={i}
                                            className="block w-1.5 h-1.5 rounded-full bg-violet-400/70"
                                            style={{
                                                animation: `mora-thinking-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-white/45">Môra denkt nach…</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Live streaming bubble — legacy free-text path */}
                <AnimatePresence>
                    {!useFramePath && isStreaming && streamingText && (
                        <motion.div
                            key="stream-bubble"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[80%] px-4 py-3 bg-white/5 border border-white/10 text-white/90 rounded-2xl">
                                <div className="flex items-start gap-2">
                                    <Bot size={16} className="mt-0.5 shrink-0 text-violet-400" />
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

                {/* Live frame stream — mora.dialogue.v1 path */}
                <AnimatePresence>
                    {useFramePath && isFrameStreaming && liveFrames.length > 0 && (
                        <motion.div
                            key="frame-stream-bubble"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[80%] w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                                <div className="flex items-start gap-2">
                                    <Bot size={16} className="mt-0.5 shrink-0 text-violet-400" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {liveFrames.map((frame, i) => (
                                            <FramedMessage key={i} frame={frame} />
                                        ))}
                                        <span
                                            style={{ display: 'inline-block', width: 2, height: '1em', background: '#34d399', verticalAlign: 'middle', marginLeft: 2 }}
                                            className="animate-pulse"
                                        />
                                    </div>
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
                                            Suche prüfen
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
                            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                            <span className="text-sm text-white/60">Môra denkt nach...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input — hidden when viewing memories tab */}
            {chatView === 'memories' ? null : moraCtx.isOperational === null ? (
                bootstrapTimedOut
                    ? <OfflineCard onRetry={() => { setBootstrapTimedOut(false); window.location.reload(); }} />
                    : <InputLoadingPlaceholder />
            ) : moraCtx.isOperational ? (
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
                                ? 'Läuft'
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

                        <div className={`flex items-end gap-2 ${isFullscreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                            <textarea
                                value={input}
                                rows={1}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    // Auto-resize: reset to 1 row, then grow to fit content
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                                        e.preventDefault();
                                        sendMessage();
                                        // Reset height after send
                                        (e.target as HTMLTextAreaElement).style.height = 'auto';
                                    }
                                    if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
                                }}
                                placeholder="Schreib Mora… (Shift+↵ für Zeilenumbruch)"
                                autoFocus={isFullscreen}
                                disabled={isStreaming}
                                style={{ resize: 'none', overflowY: 'hidden' }}
                                className={`flex-1 bg-black/40 border border-violet-500/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/10 transition-all disabled:opacity-50 ${isFullscreen ? 'text-base' : 'text-sm'}`}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading || isStreaming}
                                className="shrink-0 px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 rounded-xl text-white font-medium transition-colors flex items-center gap-2 shadow-lg shadow-violet-500/20"
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
                        openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 860, height: 720 } });
                    }}
                />
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
            paneId={paneId}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showMaximizeButton
            draggable
            resizable
            {...GLASS_SHEET_PRESENTATION}
        >
            {chatInner}
        </GlassPanel>
    );
}


'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CoreStatusBanner from '@/components/status/CoreStatusBanner';
import { useChatData } from '@/lib/hooks/useChatData';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { getHealthFlags } from '@/lib/health';
import { useMyceliumSelection } from '@/lib/mycelium/selection';
import PanelCard from '@/components/ui/PanelCard';
import MyceliumContextChip from '@/components/ui/MyceliumContextChip';
import { getSemanticAnswer, isSemanticEnabled } from '@/lib/api/semantic';
import SemanticDebugPanel from '@/components/dev/SemanticDebugPanel';

interface Message {
  id: string;
  role: 'user' | 'mora';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Zeig mir alle Objects',
  'Wie viele Documents gibt es?',
  'Liste Q4 Budget',
  'Finde Service-Orb Inhalte',
];

export default function MoraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'mora',
      content:
        'Hallo, ich bin Mora. Diese gefuehrte Demo nutzt Beispiel-Objekte. Waehle etwas im Feld oder Ordner, dann halte ich den Kontext - spaeter beantworte ich das mit euren echten Daten.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [semanticNotice, setSemanticNotice] = useState<string | null>(null);
  const [semanticDebug, setSemanticDebug] = useState<{
    prompt?: string | null;
    contextLabel?: string | null;
    answerSnippet?: string | null;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatData = useChatData();
  const { selection } = useMyceliumSelection();
  const selectionLabel =
    selection.kind === 'node'
      ? `${selection.node.label} (${selection.node.type})`
      : selection.kind === 'space'
      ? `${selection.space.label} (${selection.space.kind})`
      : null;
  const contextLine = selectionLabel
    ? `Du sprichst mit Mora ueber ${selectionLabel}.`
    : 'Noch kein konkreter Kontext - frag mich trotzdem, ich antworte mit Beispieldaten.';
  const hasDemoData = chatData.hasData;
  const { data: health, refetch: refetchHealth } = useHealthCheck();
  const { isOffline, isAuthError } = getHealthFlags(health?.status);
  const isChatDisabled = isOffline || isAuthError;
  const showDemoHint = !hasDemoData && !isChatDisabled;

  useEffect(() => {
    const anchor = messagesEndRef.current;
    if (anchor && typeof anchor.scrollIntoView === 'function') {
      anchor.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isChatDisabled) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const prompt = input;
    setInput('');
    setIsTyping(true);
    setSemanticNotice(null);

    try {
      const responseText = await getChatReply(prompt, chatData, selection, {
        onSemanticStart: () => setSemanticNotice('Semantische Auswertung wird vorbereitet ...'),
        onSemanticUnavailable: () =>
          setSemanticNotice(
            'Semantische Auswertung gerade nicht erreichbar – ich bleibe im Demo-Modus.'
          ),
        onSemanticComplete: () => setSemanticNotice(null),
        onSemanticResult: (answer) => {
          setSemanticDebug({
            prompt,
            contextLabel: selectionLabel,
            answerSnippet: answer,
          });
        },
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_mora`,
          role: 'mora',
          content: responseText,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Chat response failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_fallback`,
          role: 'mora',
          content: fallbackResponse(),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 px-5 rounded-2xl border border-border/70 bg-card/95 text-foreground shadow-xl hover:shadow-2xl mora-transition flex items-center gap-2 z-50"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Mora Chat"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
        <span className="text-sm font-semibold">{isOpen ? 'Schliessen' : 'Mora Chat'}</span>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 h-[620px] z-40"
          >
            <PanelCard className="h-full backdrop-blur-md flex flex-col overflow-hidden relative" paddingClassName="p-0 bg-card/95 shadow-2xl">
              <div className="p-4 border-b border-border/70 bg-card/90 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Mora Chat</h3>
                    <span className="px-2 py-0.5 rounded-full border border-border/70 bg-background text-[11px] text-muted-foreground">
                      {chatData.source === 'semantic' ? 'Semantic Search' : 'Objects'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{contextLine}</p>
                  {hasDemoData ? (
                    <p className="text-[11px] text-muted-foreground">
                      Gefuehrte Demo: Antworten basieren auf Beispiel-Objekten. Spaeter fliessen hier echte Kennzahlen, Dokumente und Beziehungen uebers Myzel, wenn die Auswertung aktiv ist.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600">
                      Noch keine Demo-Objekte geladen - Antworten bleiben neutral, bis Daten verbunden sind.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className={`w-2 h-2 rounded-full ${isAuthError ? 'bg-amber-500' : isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="text-muted-foreground">
                    {isAuthError ? 'Auth Thema' : isOffline ? 'Offline' : 'Online'}
                  </span>
                </div>
              </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-card/80">
              {isChatDisabled ? (
                <div className="h-full flex items-center justify-center">
                  <CoreStatusBanner
                    context="compact"
                    state={isAuthError ? 'auth' : 'offline'}
                    lastChecked={health?.timestamp}
                    onRetry={() => refetchHealth()}
                  />
                </div>
              ) : (
                <>
                  {showDemoHint && (
                    <div className="rounded-xl border border-dashed border-amber-500/70 bg-amber-500/10 px-4 py-3 text-xs text-amber-900">
                      Demo-Modus: Lade Objekte oder aktiviere den Mock-Modus, damit Mora mit Beispieldaten antworten kann.
                    </div>
                  )}
                  {semanticNotice && (
                    <div className="text-[11px] text-muted-foreground px-2">
                      {semanticNotice}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground items-center">
                    <MyceliumContextChip neutralText="Kein konkreter Kontext - frag einfach los." />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-2 rounded-xl border border-border/60 bg-background/70 hover:bg-secondary/60 mora-transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'mora' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm border ${
                          message.role === 'mora'
                            ? 'bg-muted text-foreground rounded-bl-none border-border/60'
                            : 'bg-primary text-primary-foreground rounded-br-none border-primary/40'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" />
                        Mora denkt nach ...
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

              {!isChatDisabled && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSend();
                  }}
                className="p-5 border-t border-border/70 bg-card/90"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3">
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                      placeholder="Frag nach Objects, Snapshots oder Workflows. Antworten bleiben im Demo-Modus."
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                      disabled={!input.trim() || isTyping}
                    >
                      Senden
                    </button>
                  </div>
                </form>
              )}
              <SemanticDebugPanel
                prompt={semanticDebug?.prompt}
                contextLabel={semanticDebug?.contextLabel}
                answerSnippet={semanticDebug?.answerSnippet}
              />
            </PanelCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type SemanticHooks = {
  onSemanticStart?: () => void;
  onSemanticUnavailable?: () => void;
  onSemanticComplete?: () => void;
  onSemanticResult?: (answer: string) => void;
};

async function getChatReply(
  query: string,
  chatData: ReturnType<typeof useChatData>,
  selection: ReturnType<typeof useMyceliumSelection>['selection'],
  semanticHooks?: SemanticHooks
): Promise<string> {
  // Single integration point for demo echo vs. zukuenftige echte Antworten
  const semanticActive = isSemanticEnabled();
  const trimmed = query.trim();
  if (semanticActive && trimmed) {
    const context =
      selection.kind === 'node'
        ? {
            id: selection.node.id,
            label: selection.node.label,
            type: selection.node.type,
            space: selection.node.space,
          }
        : selection.kind === 'space'
        ? {
            id: selection.space.id,
            label: selection.space.label,
            type: selection.space.kind,
            space: selection.space.label,
          }
        : undefined;
    try {
      semanticHooks?.onSemanticStart?.();
      const resp = await getSemanticAnswer({ prompt: trimmed, selection: context });
      semanticHooks?.onSemanticComplete?.();
      if (resp?.answer) {
        semanticHooks?.onSemanticResult?.(resp.answer);
        return resp.answer;
      }
      semanticHooks?.onSemanticUnavailable?.();
    } catch (error) {
      console.error('Semantic reply failed:', error);
      semanticHooks?.onSemanticUnavailable?.();
    }
  }

  return buildResponse(query, chatData);
}

async function buildResponse(query: string, chatData: ReturnType<typeof useChatData>): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) {
    return fallbackResponse();
  }

  if (!chatData.hasData) {
    return demoDataMissingResponse(trimmed);
  }

  const normalized = trimmed.toLowerCase();

  if (/(wie viele|count|anzahl)/.test(normalized)) {
    const stats = await chatData.getStats();
    const lines = Object.entries(stats.byType)
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n');

    return lines
      ? `Aktuell gibt es ${stats.total} Objects:\n${lines}`
      : 'Ich habe keine Objektdaten erhalten.';
  }

  if (/(alle objects|all objects|liste)/.test(normalized)) {
    const list = await chatData.list(10);
    if (!list.length) {
      return 'Keine Objects gefunden.';
    }
    const items = list.map((item, index) => `${index + 1}. ${item.title} (${item.type})`).join('\n');
    return `Hier sind ${list.length} Objects:\n${items}`;
  }

  const searchResults = await chatData.search(trimmed);
  if (searchResults.length > 0) {
    const top = searchResults.slice(0, 5);
    const body = top
      .map(
        (result, index) =>
          `${index + 1}. ${result.title} (${result.type})${result.tags?.length ? ` - Tags: ${result.tags.join(', ')}` : ''}`
      )
      .join('\n');

    const suffix = searchResults.length > 5 ? `\n... und ${searchResults.length - 5} weitere.` : '';
    return `Gefundene Objects:\n${body}${suffix}`;
  }

  return fallbackResponse(trimmed);
}

function fallbackResponse(prompt?: string): string {
  const header = prompt ? `Du hast gefragt: "${prompt}".` : 'Deine Frage ist angekommen.';
  return `${header}\n(Demo-Modus - Mora liefert spaeter eine ausfuehrliche Antwort.)`;
}

function demoDataMissingResponse(prompt?: string): string {
  const question = prompt ? `Du hast gefragt: "${prompt}".` : 'Anfrage empfangen.';
  return `${question}\nDemo-Modus: Es sind noch keine Objekte geladen. Verbinde zuerst eine Quelle oder starte den Mock-Modus.`;
}

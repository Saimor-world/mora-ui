'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CoreStatusBanner from '@/components/status/CoreStatusBanner';
import { useChatData } from '@/lib/hooks/useChatData';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { getHealthFlags } from '@/lib/health';

interface Message {
  id: string;
  role: 'user' | 'mora';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  '- "Zeig mir alle Objects"',
  '- "Wie viele Documents gibt es?"',
  '- "Liste Q4 Budget"',
  '- "Finde Service-Orb Inhalte"',
];

export default function MoraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'mora',
      content:
        'Hallo! Ich bin Mora. Ich kann Objektdaten abrufen, nach Tags suchen und Workflows erklaeren. Frag mich nach einem Object, Snapshot oder Workflow.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatData = useChatData();
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

    try {
      const responseText = await getChatReply(prompt, chatData);
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
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#34D399] to-[#0EA5E9] text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Mora Chat"
      >
        {isOpen ? (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 h-[620px] bg-card/95 border border-border/70 rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-border/70 bg-card/90 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Mora Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Datenquelle: {chatData.source === 'semantic' ? 'Semantic Search' : 'Objects'}
                </p>
                {hasDemoData ? (
                  <p className="text-[11px] text-muted-foreground">
                    Demo-Modus - Antworten spiegeln gespeicherte Mock-Daten.
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-600">
                    Noch keine Demo-Objekte geladen - Antworten bleiben neutral.
                  </p>
                )}

              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-muted-foreground">{isOffline ? 'Offline' : 'Live'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-card/80">
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
                      Demo-Modus: Lade Objekte oder aktiviere den Mock-Modus, damit Mora echte Daten beantworten kann.
                    </div>
                  )}
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
                className="p-4 border-t border-border/70 bg-card/90"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-2">
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                    placeholder="Frag nach Objects, Snapshots oder Workflows..."
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

async function getChatReply(query: string, chatData: ReturnType<typeof useChatData>): Promise<string> {
  // Single integration point for demo echo vs. zukuenftige echte Antworten
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

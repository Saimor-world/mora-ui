'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CoreOfflineMessage from '@/components/errors/CoreOfflineMessage';
import { useChatData } from '@/lib/hooks/useChatData';
import { useHealthCheck } from '@/lib/hooks/useApi';

interface Message {
  id: string;
  role: 'user' | 'mora';
  content: string;
  timestamp: Date;
}

const OFFLINE_STATUSES = new Set(['unreachable', 'error', 'unauthorized']);

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
        'Hallo! Ich bin Mora. Ich kann Objektdaten abrufen, nach Tags suchen und Workflows erklären. Frag mich einfach nach einem Object, Snapshot oder Workflow.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatData = useChatData();
  const { data: health, refetch: refetchHealth } = useHealthCheck();
  const healthStatus = (health?.status || '').toString().toLowerCase();
  const isOffline = OFFLINE_STATUSES.has(healthStatus);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isOffline) return;

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
      const responseText = await buildResponse(prompt, chatData);
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
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-card border border-border rounded-lg shadow-2xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Mora Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Datenquelle: {chatData.source === 'semantic' ? 'Semantic Search' : 'Objects'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-muted-foreground">{isOffline ? 'Offline' : 'Live'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {isOffline ? (
                <div className="h-full flex items-center justify-center">
                  <CoreOfflineMessage
                    error={new Error('Core API nicht erreichbar')}
                    onRetry={() => refetchHealth()}
                  />
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'mora' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                          message.role === 'mora'
                            ? 'bg-muted text-foreground rounded-bl-none'
                            : 'bg-primary text-primary-foreground rounded-br-none'
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

            {!isOffline && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
                className="p-4 border-t border-border"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Frag nach Objects, Snapshots oder Workflows..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
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

async function buildResponse(query: string, chatData: ReturnType<typeof useChatData>): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) {
    return fallbackResponse();
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
          `${index + 1}. ${result.title} (${result.type})${result.tags?.length ? ` – Tags: ${result.tags.join(', ')}` : ''}`
      )
      .join('\n');

    const suffix = searchResults.length > 5 ? `\n... und ${searchResults.length - 5} weitere.` : '';
    return `Gefundene Objects:\n${body}${suffix}`;
  }

  return fallbackResponse();
}

function fallbackResponse(): string {
  return `Ich konnte keine genauen Ergebnisse liefern. Probiere eine der folgenden Fragen:\n${SUGGESTIONS.join(
    '\n'
  )}`;
}

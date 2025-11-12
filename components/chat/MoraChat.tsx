'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'mora';
  content: string;
  timestamp: Date;
}

export default function MoraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'mora',
      content: 'Hallo! Ich bin Môra, deine AI-Assistentin. Frag mich etwas über deine Objects, Snapshots oder Workflows!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (will be replaced with real Semantic API call)
    setTimeout(() => {
      const moraMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'mora',
        content: generateMoraResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, moraMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateMoraResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // Smart keyword-based responses
    if (lowerQuery.includes('objects') || lowerQuery.includes('objekte')) {
      return `Ich sehe aktuell **15 Objects** in deinem System:\n\n- 📄 6 Files (Reports, Budgets, Analysen)\n- 🔗 4 Links (Dashboards, Figma, Docs)\n- 📝 3 Notes (Meetings, Campaigns)\n- ✉️ 1 Email (Customer Feedback)\n- ✅ 1 Task (Action Plan)\n\nMöchtest du mehr Details zu einem bestimmten Object?`;
    }

    if (lowerQuery.includes('snapshot')) {
      return `Es gibt **3 Snapshots** in deiner Timeline:\n\n**t0** (Oct 1-2): Initial State - 3 nodes\n**t1** (Oct 5-6): Growth Phase - 5 nodes\n**t2** (Oct 10-12): Mature State - 15 nodes\n\nDer neueste Snapshot zeigt das komplette Netzwerk. Wechsle zu Field Mode und schiebe die Timeline nach rechts!`;
    }

    if (lowerQuery.includes('workflow') || lowerQuery.includes('n8n')) {
      return `Du hast **3 aktive n8n Workflows**:\n\n📧 **Email Digest** - Erstellt Email-Zusammenfassungen\n📡 **Broadcast Document** - Teilt Docs über Spaces\n🔍 **Duplicate Hunter** - Findet Duplikate\n\nWechsle zu Insights um sie zu testen!`;
    }

    if (lowerQuery.includes('search') || lowerQuery.includes('suche') || lowerQuery.includes('find')) {
      return `Ich kann dir helfen zu suchen! Probiere:\n\n- "Zeig mir alle Finance Objects"\n- "Finde Dokumente vom Oktober"\n- "Welche Objects haben Tag 'q4'?"\n- "Suche nach Budget"\n\nGehe zu Folder Mode und nutze die Search-Bar oben!`;
    }

    if (lowerQuery.includes('hilfe') || lowerQuery.includes('help')) {
      return `Ich kann dir helfen mit:\n\n🔍 **Suchen** - Finde Objects nach Tags, Dates, Types\n📊 **Analysieren** - Zeige Zusammenhänge zwischen Objects\n🔗 **Verknüpfen** - Entdecke Relations und Connections\n⚡ **Workflows** - Automatisiere mit n8n\n\nWas möchtest du tun?`;
    }

    if (lowerQuery.includes('q4') || lowerQuery.includes('budget')) {
      return `Ich habe **3 Objects** zum Thema Q4/Budget gefunden:\n\n📄 **Q4 Budget Proposal 2024** (space_finance)\n📝 **Q4 Action Plan** (space_general)\n📝 **Q4 Marketing Campaign Ideas** (space_marketing)\n\nMöchtest du Details zu einem dieser Objects?`;
    }

    // Default response with suggestions
    return `Interessante Frage! Ich lerne noch, aber ich kann dir helfen mit:\n\n- "Zeig mir alle Objects"\n- "Was sind Snapshots?"\n- "Welche Workflows gibt es?"\n- "Suche nach Q4"\n\nOder wechsle zu **Folder Mode** um alle 15 Objects zu sehen!`;
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#34D399] to-[#10B981] text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-[#34D399]/10 to-[#10B981]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#34D399] to-[#10B981] flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Môra AI</h3>
                  <p className="text-xs text-muted-foreground">Deine intelligente Assistentin</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Frag Môra..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>

              {/* Quick Actions */}
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  onClick={() => setInput('Zeig mir alle Objects')}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors"
                >
                  Alle Objects
                </button>
                <button
                  onClick={() => setInput('Was sind Snapshots?')}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors"
                >
                  Snapshots?
                </button>
                <button
                  onClick={() => setInput('Suche nach Q4')}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors"
                >
                  Q4 Suche
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

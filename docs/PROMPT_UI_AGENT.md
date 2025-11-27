# PROMPT: UI-Agent für mora-ui (Phase G)

**Datum:** 2025-11-25  
**Phase:** G - UI ↔ Core Synchronisierung & Intelligence Visibility

---

## 🎯 Deine Rolle

Du bist der **UI-Agent** für mora-ui (Next.js Frontend).

**WICHTIG:** Du arbeitest **NUR** in `c:\saimor\mora-ui\`

---

## 📊 IST-STAND (Phase F Complete)

### Was bereits funktioniert ✅
- **UI läuft:** `npm run dev` → localhost:3002
- **Core-Binding:** `coreClient.ts` → localhost:8081
- **Navigation:** TreeSidebar, SpaceLayer, FolderLayer funktionieren
- **CRUD:** NodeDetailPanel (Create, Edit, Delete)
- **ChatDock UI:** Component existiert, aber nur console.log (Zeile 95)
- **Phase E Complete:** Mycelium v1, Loading States, Visual Polish

### Backend-Endpoints (verfügbar)
- `GET /v1/tree` → Struktur
- `GET /v1/departments`, `/v1/spaces`, `/v1/folders`, `/v1/nodes` → CRUD
- `GET /v1/mindloop/synthesis` → Intelligence & Risk Aggregation
- `GET /v1/mindloop/events` → Event Timeline
- `GET /v1/mindloop/clusters` → Related Objects Clusters
- `GET /v1/relations/preview` → Relation Graph Preview

### Was FEHLT ❌
- **ChatDock Backend:** Nur console.log, keine echte AI-Anbindung
- **Synthesis Visibility:** Mindloop-Daten nicht sichtbar in UI
- **Relations Preview:** Nicht visualisiert

---

## 📋 Deine Phase G Aufgaben

### G-01: ChatDock → AI Integration 🤖 HIGH PRIORITY

**Ziel:** ChatDock mit **LLM-Provider** verbinden (Provider wird vom User bereitgestellt)

**Status:** ChatDock UI läuft, aber Zeile 95: `console.log('Chat sent:', msg)`

**Ansatz:** Flexible AI-Integration - User entscheidet welcher Provider

**Tasks:**

1. **AI-Client Interface erstellen**
   - Datei: `lib/api/aiClient.ts` (NEU)
   - Abstraktes Interface für verschiedene Provider
   - Umgebungsvariable: `NEXT_PUBLIC_AI_PROVIDER` (claude, gemini, openai, etc.)
   
2. **Beispiel sendMessage Function**
   ```typescript
   // lib/api/aiClient.ts
   
   interface AIMessage {
     role: 'user' | 'assistant' | 'system';
     content: string;
   }
   
   interface ChatContext {
     departmentId?: string;
     spaceId?: string;
     folderId?: string;
     nodeId?: string;
   }
   
   export async function sendMessage(
     message: string,
     context: ChatContext,
     history: AIMessage[] = []
   ): Promise<string> {
     // Context-Aware System Prompt
     const systemPrompt = {
       role: 'system' as const,
       content: `Du bist Môra, die AI-Assistentin im SAIMÔR System.
       
       Aktueller Kontext:
       - Department: ${context.departmentId || 'ROOT'}
       - Space: ${context.spaceId || 'None'}
       - Folder: ${context.folderId || 'None'}
       
       Antworte kurz, präzise und context-aware.`
     };
     
     const userMessage = { role: 'user' as const, content: message };
     const messages = [systemPrompt, ...history, userMessage];
     
     // Provider-spezifische Implementation
     const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'anthropic';
     
     if (provider === 'anthropic') {
       // Claude API Call
       const response = await fetch('https://api.anthropic.com/v1/messages', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'x-api-key': process.env.NEXT_PUBLIC_AI_API_KEY!,
           'anthropic-version': '2023-06-01'
         },
         body: JSON.stringify({
           model: process.env.NEXT_PUBLIC_AI_MODEL || 'claude-3-5-sonnet-20241022',
           max_tokens: 1024,
           messages: messages.filter(m => m.role !== 'system'),
           system: systemPrompt.content
         })
       });
       const data = await response.json();
       return data.content[0].text;
     }
     
     // Weitere Provider hier...
     throw new Error(`Provider ${provider} not implemented`);
   }
   ```

3. **ChatDock.tsx Update**
   - Datei: `components/ui/ChatDock.tsx`
   - Zeile 95 ersetzen + Message State hinzufügen:
     ```typescript
     // State hinzufügen (nach Zeile 11):
     const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
     const [isLoading, setIsLoading] = useState(false);
     
     // Zeile 95 ersetzen:
     onSend={async (msg) => {
       setIsLoading(true);
       
       // User-Message anzeigen
       setMessages(prev => [...prev, { role: 'user', content: msg }]);
       
       try {
         const context = { 
           departmentId: activeDepartmentId,
           spaceId: activeSpaceId,
           folderId: activeFolderId
         };
         
         const reply = await sendMessage(msg, context, messages);
         
         // AI-Reply anzeigen
         setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
       } catch (error) {
         console.error('AI Error:', error);
         setMessages(prev => [...prev, { 
           role: 'assistant', 
           content: 'Entschuldigung, ein Fehler ist aufgetreten.' 
         }]);
       } finally {
         setIsLoading(false);
       }
     }}
     ```

4. **Message Rendering in ChatDock**
   - Zeile 76-88 ersetzen (Chat Area)
   - Loop über `messages` array
   - Zeige: User-Messages rechts, AI-Messages links
   - Loading-Indicator während `isLoading`

5. **ENV-Variablen**
   - `.env.local`:
     ```env
     NEXT_PUBLIC_AI_PROVIDER=anthropic
     NEXT_PUBLIC_AI_API_KEY=sk-ant-...
     NEXT_PUBLIC_AI_MODEL=claude-3-5-sonnet-20241022
     ```
   - `.env.local.example` updaten mit Platzhaltern

**Erwartetes Ergebnis:**
- ChatDock sendet zu AI-Provider (claude/gemini/openai/etc.)
- AI antwortet context-aware (kennt aktuellen Pfad)
- Messages werden in UI angezeigt
- Loading-State zeigt während Request

---

### G-02: Mindloop Synthesis Visibility 🧠 MEDIUM PRIORITY

**Ziel:** Synthesis Events sichtbar machen (für Demo)

**Backend-Endpoints (fertig):**
- `GET /v1/mindloop/synthesis` → Intelligence Summary
- `GET /v1/mindloop/events` → Event Timeline

**Tasks:**

1. **Mindloop API-Client**
   - Datei: `lib/api/mindloopClient.ts` (NEU)
   ```typescript
   import { coreClient } from './coreClient';
   
   export async function fetchSynthesis() {
     return coreClient.get('/v1/mindloop/synthesis');
   }
   
   export async function fetchEvents(limit = 10) {
     return coreClient.get(`/v1/mindloop/events?limit=${limit}`);
   }
   ```

2. **Synthesis Panel Component** (optional)
   - Datei: `components/intelligence/SynthesisPanel.tsx` (NEU)
   - Zeigt: Risk Level, Event Count, Top Risks
   - Position: Oben rechts als glasspanel
   - Toggle: Click to expand/collapse

3. **Mycelium Upgrade** (optional, später)
   - Datei: `components/organic/MyceliumOverlay.tsx`
   - Load `/v1/mindloop/clusters`
   - Visualize: Cluster-Connections

**Erwartetes Ergebnis:**
- Synthesis-Daten sind sichtbar (Panel oder in Chat)
- Events werden geladen

---

### G-03: Relations Preview Integration 🔗 LOW PRIORITY

**Ziel:** Relations Graph sichtbar machen

**Backend-Endpoint:** `GET /v1/relations/preview`

**Tasks:**
1. Relations-Client erstellen
2. Visualisierung (z.B. in NodeDetailPanel als "Related Nodes")

---

## 🔧 Development Workflow

### Start
```bash
cd c:\saimor\mora-ui
npm run dev  # Port 3002
```

### Core muss laufen!
```bash
cd c:\saimor\saimor-core\core
python run.py  # Port 8081
```

### Test
1. Chat öffnen → Message senden
2. Gemini antwortet
3. Context-Bar zeigt aktiven Pfad

---

## ✅ Erfolgs-Kriterien

Phase G erfolgreich wenn:
- [ ] ChatDock sendet zu Gemini 2.0 Flash
- [ ] AI antwortet context-aware
- [ ] Messages werden angezeigt
- [ ] Synthesis-Daten sichtbar (Panel oder Chat-Integration)
- [ ] UI läuft stabil (npm run build erfolgreich)

---

## 📊 Output

Nach Abschluss:
1. **Code:** Committed (`feat(ui): Gemini 2.0 Flash integration + Synthesis visibility`)
2. **Docs:** Update `INTEGRATION_STATUS.md`
3. **Test:** Demo-Flow getestet (Navigation → Chat → Synthesis)

---

**LLM:** Gemini 2.0 Flash (Google AI Studio)  
**Phase:** G (UI ↔ Core Synchronisierung)  
**Bereit für:** KI Garage Demo (Januar 2026)

# Mora Memory — Chat-Integration Design

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Mora ist im Chat konsistent mit dem was sie weiß — Erinnerungen werden erkannt, abgerufen, injiziert und bestätigt. Dies ist Spec 1 von 5 der Jarvis-Roadmap.

**Architecture:** Drei unabhängige Fixes + ein neues Feature, alle im INTERFACE. CORE bekommt einen minimalen Patch für Memory-Kontext-Injection in den Agent-Endpoint.

**Tech Stack:** TypeScript, React, TanStack Query, `memoryClient.ts`, `cognitionClient.ts`, FastAPI (CORE)

---

## Problem-Statement

Aus einem echten Gespräch zwischen Marius und Mora:

1. **Recall-Bug:** Mora öffnet einen FinderPane-Search mit dem Memory-Inhalt als Query-String wenn der User nach Erinnerungen fragt → "Kein klarer Treffer"
2. **Kontext-Bug:** `/v3/cognition/agent` bekommt kein Memory-Kontext → Mora weiß im Chat nicht was sie gespeichert hat
3. **Feedback-Bug:** Mora sagt "Gespeichert" aber kann es nicht zeigen → Vertrauen bricht

---

## File Structure

```
INTERFACE/
  lib/
    chat/
      memoryIntent.ts          MODIFY — Recall-Intent-Detection hinzufügen
      memoryRecall.ts          CREATE  — Recall-Handler: fetch + format memories
    api/
      cognitionClient.ts       MODIFY  — memory_context param in executeAgenticLoop
  components/
    panes/
      ChatPane.tsx             MODIFY  — Recall-Routing + Save-Confirmation UI

CORE/
  core/
    routers/
      cognition.py             MODIFY  — memory_context aus Request lesen + in Prompt injizieren
```

---

## Component 1: Recall-Intent-Detection

**Datei:** `lib/chat/memoryIntent.ts`

Erweitert die bestehende Datei um Recall-Keywords. Recall-Intent → nie an Agent weiterleiten. Nur `fetchMoraMemories` / `searchMoraMemories`.

```typescript
const RECALL_KEYWORDS = [
  'zeig mir', 'zeige mir', 'was weißt du', 'was weisst du',
  'erinnerungen', 'erinnerst du dich', 'was hast du gespeichert',
  'meine memories', 'dein gedächtnis', 'was weiß du über mich',
  'show memories', 'what do you remember', 'recall'
];

export function detectRecallIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return RECALL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function isMemoryQuery(text: string): boolean {
  return detectMemoryIntent(text) || detectRecallIntent(text);
}
```

---

## Component 2: Recall-Handler

**Datei:** `lib/chat/memoryRecall.ts` (neu)

Fetcht Memories und formatiert sie als Chat-Nachricht. Keine Agent-Calls. Direkte Antwort.

```typescript
import { fetchMoraMemories, searchMoraMemories } from '@/lib/api/memoryClient';

export interface MemoryRecallResult {
  found: boolean;
  memories: Array<{ summary: string; scope: 'user' | 'company'; timestamp: string }>;
  message: string;
}

export async function recallMemories(query: string): Promise<MemoryRecallResult> {
  // Semantische Suche wenn spezifische Frage, sonst letzte 20
  const isSpecific = query.length > 30 && !query.toLowerCase().includes('alle');
  
  const memories = isSpecific
    ? await searchMoraMemories(query, 10)
    : await fetchMoraMemories(20);

  if (!memories || memories.length === 0) {
    return {
      found: false,
      memories: [],
      message: 'Ich habe noch keine Erinnerungen gespeichert.'
    };
  }

  return {
    found: true,
    memories: memories.map(m => ({
      summary: m.summary,
      scope: 'user', // v1: user-scoped; company-scope in Spec 2
      timestamp: m.created_at
    })),
    message: `Ich erinnere mich an ${memories.length} Dinge:`
  };
}
```

---

## Component 3: Memory-Kontext-Injection

**Datei:** `lib/api/cognitionClient.ts`

Vor dem Agent-Call werden die letzten 10 Memories abgerufen und als `memory_context` mitgeschickt.

```typescript
// In executeAgenticLoop(), vor dem corePost:
const recentMemories = await fetchMoraMemories(10).catch(() => null);
const memoryContext = recentMemories
  ? recentMemories.map(m => m.summary).join('\n- ')
  : null;

// Im corePost payload:
{
  intent,
  // ... bestehende Felder ...
  memory_context: memoryContext,
}
```

**CORE-Patch** (`cognition.py`): `memory_context` aus Request lesen, vor dem System-Prompt als Block einfügen:

```python
if memory_context:
    system_prefix = f"Du erinnerst dich an folgendes über den Nutzer:\n- {memory_context}\n\n"
    system_prompt = system_prefix + system_prompt
```

---

## Component 4: Save-Confirmation UI

**Datei:** `components/panes/ChatPane.tsx`

Nach erfolgreichem `learnInsight`-Call: Inline-Bestätigung mit dem gespeicherten Inhalt.

```typescript
// Nach learnInsight():
if (result.status === 'ok' || result.status === 'pending') {
  const scope = result.risk === 'high' ? '🏢 Firma (Review nötig)' : '👤 Persönlich';
  addSystemMessage({
    type: 'memory_confirmation',
    text: `✓ Gespeichert [${scope}]: "${insight}"`,
    status: result.status
  });
}
```

---

## Recall-Routing in ChatPane

```typescript
// In der Message-Submit-Handler:
if (detectRecallIntent(userMessage)) {
  const result = await recallMemories(userMessage);
  // Direkt als Chat-Nachricht rendern, KEIN executeAgenticLoop
  setChatMessages(prev => [...prev, {
    role: 'mora',
    content: result.message,
    memories: result.memories,
    type: 'memory_recall'
  }]);
  return; // ← kein Agent-Call
}
```

---

## Scoping (User vs Company)

**v1 (dieser Spec):** User-scoped Memories (`fetchMoraMemories` / `searchMoraMemories`). Company-Scope existiert im Datenmodell (`company_id` auf `MemoryEntry`), wird in Spec 2 angekoppelt.

Scope-Heuristik für `learnInsight`:
- Kategorie `preference`, `tone`, `phrasing`, `context` → `user_id` gesetzt
- Kategorie `fact`, `goal`, `policy`, `team`, `technical` → `company_id` gesetzt
- Beide können parallel gesetzt sein (persönlicher Fakt im Firmenkontext)

---

## Fehlerbehandlung

| Fehlerfall | Verhalten |
|------------|-----------|
| Memory-API nicht erreichbar | Agent-Call läuft ohne Kontext (silent fallback) |
| Recall liefert 0 Ergebnisse | Mora sagt "Noch nichts gespeichert" — kein FinderPane |
| `learnInsight` schlägt fehl | Mora sagt "Konnte nicht speichern, versuch es nochmal" |
| CORE injiziert Memory-Block nicht | Chat läuft normal — Memory-Feedback zeigt trotzdem |

---

## Test-Kriterien

1. User tippt "zeig mir meine Erinnerungen" → Mora antwortet mit Liste, kein FinderPane öffnet sich
2. User tippt "merke dir: ich mag keine langen Listen" → Mora bestätigt direkt im Chat was gespeichert wurde
3. Nach dem Speichern neue Nachricht senden → Mora nutzt die gespeicherte Info in ihrer Antwort
4. Erinnerungen-Tab UND Chat-Tab zeigen konsistente Daten
5. Bei leerem Memory: "Ich habe noch nichts gespeichert" — kein Fehler, kein Spinner

---

## Out of Scope (andere Specs)

- Company-scoped Memories im Chat (→ Spec 2)
- Proaktive Mora-Initiativen (→ Spec 3)
- Outcome-Feedback / Tone-Adaption (→ Spec 4)
- OpenClaw Tool-Bridge (→ Spec 5)

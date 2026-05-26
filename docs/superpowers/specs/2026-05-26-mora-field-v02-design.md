# Môra Field v0.2 — Design Spec

> **Status:** Approved  
> **Date:** 2026-05-26  
> **Context:** AmbientRoom v0.1 is live. Voice capture works. The save action disappears into the void — no feedback, no Môra presence. This spec defines the redesign.

---

## Vision

Môra Field is the **voice interface of Saimôr OS**. Not a form. Not a capture tool. A presence.

The user speaks. Môra listens, understands, responds — verbally and visually. She executes actions inside the OS. The room stays open until the user leaves. It is a playground that grows into a full OS command layer.

---

## User Journey

```
[Alt+A or Dock: Field]
      │
      ▼
IDLE
  Môra glows softly. "Drücken & halten oder Leertaste."
      │
      │  Space hold / Mic press
      ▼
LISTENING
  Ripple rings. Live transcript appears as user speaks.
      │
      │  Release
      ▼
THINKING
  Orb pulses. "Môra verarbeitet…"
  → sends transcript to AI
      │
      │  AI response arrives
      ▼
RESPONDING
  Môra speaks (Web Speech Synthesis, de-DE).
  AmbientIntentCard appears:
    - What Môra understood (1 sentence)
    - Proposed action (tool + target)
    - One prominent "Ausführen" button
      │
      │  User confirms
      ▼
EXECUTING
  Tool is called. Progress indicator.
  "Erstellt Node in R&D / Product…"
      │
      │  Tool completes
      ▼
DONE
  Môra confirms verbally + brief success flash.
  Room stays open → user can speak again (loop to IDLE).
      │
      │  ESC or Zurück-button
      ▼
[Back to OS]
```

**Key rule:** The room never navigates away automatically. Môra is a presence, not a form. The user decides when to leave.

---

## Architecture

### Data Flow

```
User speaks
    │
    ▼
Web Speech API → transcript (string)
    │
    ▼
useAmbientMora.sendToMora(transcript)
    │
    ├── Phase A: moraAgentClient.chat([{ role: 'user', content: transcript }])
    │            → AI text response
    │            cursorBridge.parseAIResponse(text)
    │            → { commands: MoraCommand[] }
    │
    └── Phase C: POST /v3/mora/field  (drop-in replace, same return shape)
                 → { text: string, toolCalls: ToolCall[] }
    │
    ▼
{ text, toolCalls }
    │
    ├── text → useSpeechSynthesis.speak(text)   [Môra speaks]
    │          + AmbientIntentCard renders intent summary
    │
    └── toolCalls → useAmbientMora.executeMoraTools(calls)
                    → moraAgentClient.executeTools(calls)
                    │
                    ├── createNode(...)         Capture
                    ├── openPane(type, data)    OS navigation
                    ├── navigateToDepartment(id)
                    ├── searchGlobal(query)
                    └── [extensible via tool registry]
```

### State Machine

```typescript
type AmbientState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'responding'   // NEW — Môra has reply, Intent card visible
  | 'executing'    // NEW — tool running
  | 'done'         // NEW — success, brief confirmation
  | 'error';       // NEW — failure, Môra explains
```

Previous `'cards'` state is removed. Intent is shown in a single `AmbientIntentCard`, not 4 cards.

---

## Components

### Modified: `components/ambient/AmbientRoom.tsx`

- Adopts the new 7-state machine
- Removes `showConfirm` overlay — confirmation is inline in `AmbientIntentCard`
- Removes `navigateToCore()` from the save path
- Removes the 4-card grid (`AmbientCard` components)
- Delegates AI interaction to `useAmbientMora`
- Delegates voice output to `useSpeechSynthesis`
- Renders `AmbientIntentCard` when state is `responding` or `executing`
- `done` state: 1.5s success flash → auto-resets to `idle` (loop)
- `error` state: Môra explains verbally + shows retry option

### New: `lib/hooks/useAmbientMora.ts`

Single responsibility: talk to Môra AI and execute tools.

```typescript
interface AmbientMoraResult {
  text: string;           // Môra's verbal response
  toolCalls: ToolCall[];  // parsed tool calls (may be empty) — ToolCall from moraAgentClient types
  intent: string;         // short human-readable summary
}

interface UseAmbientMora {
  sendToMora(transcript: string): Promise<AmbientMoraResult>;
  executeMoraTools(calls: ToolCall[]): Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

**Phase A implementation:**
- `sendToMora` → `moraAgentClient.chat` + `cursorBridge.parseAIResponse`
- Maps parsed `MoraCommand[]` to `ToolCall[]` shape

**Phase C migration (drop-in):**
- `sendToMora` → `POST /v3/mora/field` with same return interface
- `useAmbientMora` is the only file that changes

### New: `lib/hooks/useSpeechSynthesis.ts`

Wraps Web Speech Synthesis API.

```typescript
interface UseSpeechSynthesis {
  speak(text: string, lang?: string): void;
  cancel(): void;
  isSpeaking: boolean;
  isSupported: boolean;
}
```

- Default lang: `'de-DE'`
- Falls back silently if `window.speechSynthesis` unavailable
- Cancels previous utterance before new one starts

### New: `components/ambient/AmbientIntentCard.tsx`

Displays what Môra understood and what she will do.

```
┌─────────────────────────────────────────────────┐
│  🧠  Was ich verstanden habe                     │
│      "Du möchtest eine Note in R&D erstellen"    │
│                                                  │
│  ⚡  Aktion                                      │
│      Node → R&D / Product / Sprint-Notes         │
│                                                  │
│  [ Ausführen ]          [ Anpassen ]             │
└─────────────────────────────────────────────────┘
```

- Shown in `responding` state
- "Ausführen" → transitions to `executing`
- "Anpassen" → opens editable fields inline (folder picker, text editor)
- Disappears when state is `executing` → replaced by progress line
- On `done`: brief green flash, then fades

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Speech API unavailable | Fallback text input (existing) |
| `sendToMora` fails | `error` state, Môra says "Ich konnte das nicht verarbeiten", retry button |
| Tool execution fails | `error` state, specific error shown, room stays open |
| Empty transcript | Stays in `idle`, no transition |
| No tool calls in response | Show text response only, no action card, loop to `idle` after 3s |

---

## OS Actions — Phase A (available now)

| Intent example | Tool | Existing? |
|---|---|---|
| "Erstelle eine Note in R&D" | `createNode(...)` | ✅ moraState.addNode |
| "Öffne den Finder" | `openPane('finder')` | ✅ paneStore.openPane |
| "Geh zu Growth" | `navigateToDepartment(id)` | ✅ navStore |
| "Suche nach Sprint-Retro" | `searchGlobal(query)` | ✅ coreClient |
| "Öffne den Chat" | `openPane('chat')` | ✅ paneStore.openPane |

---

## OS Actions — Phase C (extensible tool registry)

Phase C adds a backend tool registry. Tools are declared server-side, Môra knows them via `listTools()`. New tools are added to the registry without frontend changes.

Future tools:
- `createCalendarEvent(...)` — Calendar pane integration
- `sendChatMessage(scope, text)` — Chat integration  
- `summarizeFolder(folderId)` — AI summary on demand
- `generateVideo(prompt)` — Gemini Omni (future)

---

## Migration Path

```
v0.2  useAmbientMora via Approach A
      moraAgentClient.chat + cursorBridge
      Room is alive: Môra speaks, intent card, tool execution

      ↓ same hook interface, different backend

v0.3  useAmbientMora.sendToMora → POST /v3/mora/field
      Backend owns tool resolution
      Frontend unchanged

v0.4+ Tool registry grows
      Gemini Omni response types
      Video rendering in AmbientRoom
```

The hook is the seam. `AmbientRoom` never knows which phase it is in.

---

## Testing

- `useAmbientMora.test.ts` — mock `moraAgentClient`, assert correct tool dispatch per transcript
- `useSpeechSynthesis.test.ts` — mock `window.speechSynthesis`, assert speak/cancel lifecycle
- `AmbientIntentCard.test.tsx` — renders intent + action, confirm/adjust buttons work
- `AmbientRoom` integration: existing pattern from `Spotlight.navigation.test.tsx`

---

## Out of Scope (v0.2)

- Video generation
- Multi-turn conversation history (single-shot per session for now)
- Backend `/v3/mora/field` endpoint (Phase C)
- Calendar/Mail external integrations

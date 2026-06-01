# Mora Chat Rethink — Design Spec

**Date:** 2026-06-01  
**Author:** Claude Sonnet (research) — Opus 4.8 review recommended before build  
**Status:** Draft — feeds Roadmap workstream 4.3 (Chat/Mora)  
**Scope:** Full rethink of the ChatApp surface, the streaming/agent contract, and the CORE endpoints. No code changes in this document.

---

## 0. Scratch notes — What the codebase audit revealed

*These notes are left visible per spec author request. They document current reality before the rethink.*

**File map of the current chat stack:**

| Layer | File | Size |
|---|---|---|
| App entry | `apps/chat/index.tsx` | 2131 lines — one giant component |
| Pane wrapper | `components/panes/ChatPane.tsx` | 10 lines — just AppLoader delegation |
| SSE stream hook | `lib/hooks/useMoraStream.ts` | 361 lines |
| Frame stream hook | `lib/hooks/useMoraFrameStream.ts` | exists, flag-gated |
| Context hook | `lib/mora/useMoraContext.ts` | 272 lines — solid |
| Context chip | `components/mora/MoraContextChip.tsx` | 171 lines — solid |
| Agent client | `lib/api/cognitionClient.ts` | 211 lines |
| Chat client | `lib/api/moraAgentClient.ts` | 146 lines |
| Chat state (scoped) | `lib/store/chatStore.ts` | 17 lines — scope state only |
| Old chat store (CLEARING) | `lib/chat/chatStore.ts` | 55 lines — channel model, unused in INTERFACE |

**What the current chat actually does:**

1. **SSE token streaming** — `useMoraStream` → `POST /v3/chat/stream`. Token-by-token, with preamble frames for orb state, scope resolution, and answer provenance. Works.
2. **Typed-frame stream** — `useMoraFrameStream` → same endpoint, reads structured `MoraFrame` objects. Behind `isMoraDialogueV1Enabled()` feature flag — not generally live yet.
3. **Agentic loop** — `executeAgenticLoop()` → `POST /v3/cognition/agent`. Up to 10 tool iterations, returns `AgentResponse` with `iterations[]`, `tools_executed[]`, `pending_confirmations[]`, `work_session_plan`. Fired when the message looks like a file-operation intent OR `activePlanId` is set. Tool result: a single `final_message` string — **the per-tool execution trace is thrown away in the UI**.
4. **Navigation/search intents** — `parseIntent()` regex-routes "zeig mir X" / "suche nach X" client-side, before any AI. Resolves via `resolveOpenIntent()` CORE endpoint. The `AmbiguityChoiceSurface` handles multi-hit disambiguation. This works.
5. **Recall intent** — `detectRecallIntent()` short-circuits the whole pipeline, fetches memories directly from `fetchMoraMemories()`, renders as plain text. Works, but raw.
6. **Memory save** — `SaveInsightButton` per assistant message, plus `MemoryHint` banner for detected "merke dir" intent. Manual category select.
7. **Memory recall display** — `RelevantMemories` panel, shown when backend signals `answer_source === 'memory'`, or when a semantic search for the query returns hits. Displays top 3.
8. **Context chips** — `MoraContextChip` in the header (compact variant). Scope breadcrumb, enforced-lock, pending-memory count, answer-source pill. Present but tiny and easily missed.
9. **Work session plan** — if the agent creates a plan, a "Plan anzeigen" pill appears on the message. Works.
10. **Confirmation cards** — `ConfirmationCard` for tool calls flagged `risk_level: write | secrets`. Works.
11. **Communication context injection** — `buildCommunicationOperationalContextMessage()` prepends live mail/calendar/feed summary to streaming history. Partially wired; depends on integration sync (Roadmap 4.7/4.8).
12. **Perception bundle** — `useMoraPerception()` fetched and attached to stream context when `isMoraPerceiveV1Enabled()`. Flag-gated.
13. **`executeTools` path (MR21)** — `moraAgentClient.executeTools()` → `POST /v3/mora/tools/execute`. **Exists in the client but is NOT called from ChatApp.** The chat only uses `cognitionClient.executeAgenticLoop()`. The MR21 tool execution path is wired but dormant in chat.

**What is broken or deeply suboptimal:**

- **2131-line monolith.** `ChatApp` owns routing logic, streaming, memory, navigation, work-session state, confirmation, fullscreen, tabs, suggestions — all in one component. No composition.
- **Tool results are invisible.** When `executeAgenticLoop` runs 3 tools, the user sees the `final_message` string only. There is no inline trace of what Mora did.
- **Streaming vs agentic paths are disjointed.** The decision between `streamSend` and `executeAgenticLoop` is a rough keyword heuristic (`shouldPreferAgenticLoop`). Routing is easy to fool.
- **`moraAgentClient.chat()` is effectively dead.** The `m.chat()` method wraps `/v3/chat` (non-streaming) and was a pre-stream workaround. The app never calls it directly.
- **No attachment support.** No file/image drop target. No way to send a document to Mora for analysis.
- **No inline canvas / rich card responses.** The Larry audit (capability architecture spec) documents that OpenClaw already supports chart/table/timeline widgets. Mora returns only markdown strings.
- **No async "background task" mode.** Every request blocks the input. There is no "do this while I keep working" path.
- **Memory UX is fragile.** The recall path is keyword-gated (German only), displays as plain text, and lacks scope clarity (user vs. company). The "Merken" category picker is hidden under a hover button.
- **Context chips are decorative, not interactive.** The scope breadcrumb and answer-source pill are read-only. Clicking the scope does nothing.
- **Frame path (`MoraDialogueV1`) is not generally enabled.** Until it is, structured responses are unavailable.

---

## 1. Vision

Mora chat is not a chatbot — it is the OS's primary conversational surface. In three words: **context, action, transparency.**

- **Context:** Mora knows where you are, what you're looking at, what she knows about your company, and shows that. She never starts cold.
- **Action:** Mora does things — creates, searches, drafts, delegates, executes tools — and shows each step inline so you can trust it.
- **Transparency:** Every answer carries a provenance signal. Every tool execution shows what happened. Scope is always visible and interactive.

The benchmark is not other chatbots. It is the Larry/OpenClaw experience: context-injection before every message, canvas visualizations, async missions, agent delegation fan-out.

---

## 2. Current state vs target

| Capability | Today (verified) | Target |
|---|---|---|
| Token streaming | Yes — `/v3/chat/stream` | Keep, enhance with typing indicator |
| Typed-frame responses | Flag-gated, not live | Enable for all users |
| Tool use (agentic loop) | Yes, keyword-heuristic routing | Always available; routing on backend |
| Tool results visible | No — `final_message` only | Yes — per-tool result cards inline |
| Context chips | Header, compact, read-only | Full row below input; interactive |
| Memory recall | Keyword-gated, plain text | Semantic, rich card, always reachable |
| Memory save | Manual button per message | Explicit confirm card; scope (👤/🏢) shown |
| Attachments | None | File drop + image paste |
| Inline canvas | None | Chart / table / timeline widget frames |
| Async background tasks | None | "Im Hintergrund" toggle → mission card |
| Communication injection | Partial, flag-gated | Always active for authenticated users |
| Scope interaction | Display only | Clickable — narrows or widens Mora's scope |
| Multi-pane awareness | Basic (active pane from paneStore) | Rich — Mora can reference and act on open panes |
| Deep-work mode | None | Fan-out to specialist agents, show steps |
| Code / content in response | Markdown-rendered | Full code block with copy button |
| Welcome state | Hardcoded string with d1/d2 dept names | Context-aware, uses real scope labels |

---

## 3. What Mora Chat SHOULD do — the capability list

Ordered by user value and implementation feasibility:

### 3.1 Streaming with live tool trace (P0 — highest value)

Every agent turn shows:
1. Mora's reasoning step ("Ich schaue in deinen Ordnern nach…")
2. Each tool call as it fires, with a status pill (pending → success/fail)
3. The tool result — a rich card, not raw JSON
4. The final answer

The `AgentIteration[]` array from `/v3/cognition/agent` already carries this data. It is simply not being rendered.

**Implementation path:** The `executeAgenticLoop` response already includes `iterations[]` and `tools_executed[]`. The frontend needs a streaming-compatible iteration viewer — a `ToolTraceCard` component. Alternatively, `/v3/cognition/agent` can be made to stream SSE frames for each iteration (backend change). SSE iteration streaming is architecturally cleaner (no polling) but requires a CORE contract update (see §6).

### 3.2 Context-aware scope header (P0)

Replace the tiny header chip with a full context bar below the input:
- Company › Department › Space › Folder breadcrumb (from `useMoraContext`)
- "Scope anpassen" button — opens a scope picker so the user can widen or narrow Mora's context without changing navigation
- Answer provenance pill after each response
- Memory ready indicator (count of loaded memories for this scope)

The data already exists in `useMoraContext()`. This is a UI composition change.

### 3.3 Inline tool result cards (P1)

A library of typed result card renderers:
- `SearchResultCard` — list of found documents with open-button
- `CreatedNodeCard` — "Notiz erstellt: [title]" with open-button
- `MemoryCard` — recalled memory with scope badge
- `MailDraftCard` — subject + preview + "Im Mail öffnen" button
- `CalendarCard` — event summary
- `CanvasCard` — chart/table widget (requires CORE to return structured canvas data)

These cards appear inline in the message thread, replacing the current `final_message`-only rendering.

### 3.4 Memory as first-class surface (P1)

The current "Erinnerungen" tab is a raw list. Rethink:
- Recall shows rich `MemoryCard` components with scope badge (👤 personal / 🏢 company)
- Save workflow: after a saveable turn, Mora proactively offers "Soll ich das behalten?" with scope suggestion based on category heuristic (Spec 1 logic already designed in `mora-memory-chat-integration-design.md`)
- Memory basis panel shows which memories informed the current answer, with "Warum?" expandable

### 3.5 Attachment support (P1)

- File drop target overlaid on the message list
- Image paste from clipboard
- Sends file as base64 or multipart to `/v3/chat/stream` with a new `attachments` field
- Mora acknowledges the file and can summarize, extract, or ask questions about it

**CORE contract needed:** `POST /v3/chat/stream` must accept `attachments: [{name, mime_type, data_base64}]` and route to a vision-capable model when images are present.

### 3.6 Async background tasks / missions (P2)

Some tasks should not block the chat:
- User sends "Schreibe eine Zusammenfassung aller Dokumente in Projekt X"
- Mora replies "Ich starte das im Hintergrund. Du kannst währenddessen weiterarbeiten."
- A mission card appears in the chat with live status (polling or SSE)
- When done, Mora speaks the result back into the thread

The work-session plan mechanism already exists (see §0 point 11 — `planId` rendering). This is an extension of that: lighter missions that don't require a full plan.

**CORE contract needed:** `POST /v3/cognition/mission` → `{mission_id, status: 'queued'}`. `GET /v3/cognition/mission/{id}` for status polling.

### 3.7 Deep-work mode / agent fan-out (P3)

A toggle ("Tief arbeiten") that, for complex requests, fans the intent out to specialist sub-agents (strategy, research, code) and synthesizes their outputs. Mirrors the Larry council model (`atlas`, `forge`, `scout`, `nightwatch`).

Requires the hybrid OpenClaw integration (see `mora-capability-architecture.md` §5 Option C), which is a significant backend investment. Defer until the OpenClaw spike is done.

---

## 4. Visual design direction

The chat surface should be visually first-class — at the same expressiveness tier as the Signal Wall and Audit Dossier (ref: `db5a823`/`f69f225` commits).

**Rules:**
1. **The message list is the stage.** Tool cards, memory cards, canvas widgets are actors on it — not tooltips or collapsed accordions.
2. **Mora's avatar / orb state is always visible.** OrbState (`idle`, `thinking`, `alert`, `speaking`) should drive a live visual indicator in the header, not just the global orb.
3. **Color communicates meaning.** Tool success = cyan. Tool fail = red. Memory = violet. Calendar = amber. Scope enforced = amber lock.
4. **Input area is calm.** One text field, one send button, one attachment icon, one context indicator. No clutter.
5. **Scope bar is informational, not decorative.** It answers "what does Mora know right now?"

**Layout (sketch):**

```
┌─────────────────────────────────────────────────────────┐
│  [Ora orb / avatar — animated per orbState]   Môra   [⤢] │
├─────────────────────────────────────────────────────────┤
│  SCOPE: AcmeCorp › Product › Q3-Launch  [Scope ändern]  │
│  Erinnerungen: 12 geladen  ·  Antwortquelle: Gedächtnis │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [message thread — messages + tool cards + canvas]     │
│                                                         │
│   ┌─ Tool trace (inline, collapsible) ──────────────┐   │
│   │ ✓ search_nodes        "Q3 Roadmap.md" — 1 Treffer│   │
│   │ ✓ read_node_content   Zusammenfassung geladen    │   │
│   └──────────────────────────────────────────────────┘  │
│                                                         │
│   ┌─ Mora antwortet ────────────────────────────────┐   │
│   │ Das Q3 Roadmap-Dokument zeigt...                │   │
│   └─────────────────────────────────── [Merken]  👤 ┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [📎] [________ Frag Mora... ________] [↵ Senden]       │
│  [Im Hintergrund] [Tief arbeiten (Alpha)]               │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Component architecture (after rethink)

Break the 2131-line monolith into:

```
apps/chat/
  index.tsx                    ← orchestrator only (~200 lines)
  components/
    ChatHeader.tsx             ← avatar, title, fullscreen toggle
    ChatScopeBar.tsx           ← scope breadcrumb, answer provenance, memory indicator
    ChatMessageList.tsx        ← message rendering + scroll
    ChatInput.tsx              ← text field + send + attachment + mode toggles
    ChatSuggestions.tsx        ← context-aware quick prompts (already partially extracted)
    ToolTraceCard.tsx          ← per-iteration agentic trace
    MemorySaveCard.tsx         ← proactive save confirmation
    MissionCard.tsx            ← async background task progress
    CanvasWidget.tsx           ← chart / table / timeline from CORE canvas data
    results/
      SearchResultCard.tsx
      CreatedNodeCard.tsx
      MailDraftCard.tsx
      CalendarCard.tsx

lib/chat/
  useChat.ts                   ← consolidated state hook; replaces state scattered in index.tsx
  useAgentStream.ts            ← SSE iteration streaming (new — replaces raw useMoraStream for agent turns)
  routing.ts                   ← intent routing extracted from processMessage()
```

The `useMoraStream` and `useMoraFrameStream` hooks remain — `useAgentStream` wraps or replaces the choice between them with a unified interface.

---

## 6. CORE contracts needed

These are the backend API changes required to enable the target capabilities.

### 6.1 Streaming agent iterations — modify `POST /v3/cognition/agent`

Add SSE streaming mode (triggered by `Accept: text/event-stream` header or `stream: true` param):

```
event: iteration
data: {"iteration": 1, "state": "S2_THINK", "llm_thought": "..."}

event: tool_call
data: {"iteration": 2, "tool_name": "search_nodes", "tool_params": {"query": "..."}}

event: tool_result
data: {"iteration": 2, "tool_name": "search_nodes", "success": true, "result": [...]}

event: done
data: {"final_state": "S5_RESPOND", "final_message": "..."}
```

Non-streaming response shape stays unchanged (backward compat).

### 6.2 Attachments — modify `POST /v3/chat/stream`

Accept multipart or JSON with:

```json
{
  "message": "Analysiere dieses Dokument",
  "attachments": [
    {
      "name": "report.pdf",
      "mime_type": "application/pdf",
      "data_base64": "..."
    }
  ]
}
```

Backend routes to a vision/document-capable model when attachments are present. Returns same SSE stream.

### 6.3 Canvas widget responses — extend SSE frame types

New frame type `canvas` in the SSE stream:

```json
{
  "type": "canvas",
  "canvas_type": "bar_chart",
  "data": {"labels": [...], "values": [...]},
  "title": "Dokumente nach Abteilung"
}
```

Frontend renders via `CanvasWidget.tsx`. Adopts the canvas pattern from Larry's `POST /api/larry/canvas`.

### 6.4 Background missions — new endpoint `POST /v3/cognition/mission`

```json
// Request
{"intent": "...", "context": {...}, "background": true}

// Response
{"mission_id": "m_123", "status": "queued", "title": "Zusammenfassung erstellen"}
```

`GET /v3/cognition/mission/{id}` returns `{status, progress, result?, error?}`.

Frontend polls or subscribes. `MissionCard.tsx` renders live state.

### 6.5 Scope API — new `POST /v3/chat/scope`

Allows the user to explicitly set a chat scope independently of navigation state:

```json
// Request
{"company_id": "...", "department_id": "...", "space_id": null, "folder_id": null}

// Response
{"scope_set": true, "label": "AcmeCorp › Product"}
```

Used by the `ChatScopeBar` "Scope ändern" control.

---

## 7. Phased build plan

### Phase 1 — Foundation + tool transparency (2 weeks)

**Goal:** Mora shows her work. Every tool call is visible.

1. **Component split** — break `apps/chat/index.tsx` into the component tree in §5. Zero behavior change. Target: index.tsx ≤ 250 lines.
2. **Enable MoraDialogueV1 flag** for all users (or remove the flag if the frame stream is stable).
3. **ToolTraceCard** — render `iterations[]` and `tools_executed[]` from `executeAgenticLoop` as collapsible inline cards. Success = cyan check; fail = red x; pending = spinner.
4. **ChatScopeBar** — extract from header chip to full bar below the messages, before the input. Interactive scope picker (dropdown over company/dept/space/folder). Wires to existing `useMoraContext()` data.
5. **Fix the routing heuristic** — the keyword-based `shouldPreferAgenticLoop()` decision creates false positives and false negatives. Replace with: always try `/v3/chat/stream` first; the backend decides if a tool call is needed (the model does this natively). Remove client-side keyword routing for the agentic path.

**CORE ask for Phase 1:** None — frontend only. The `AgentResponse` already carries iteration data; it just needs to be rendered.

### Phase 2 — Memory UX + attachments (1.5 weeks)

**Goal:** Mora is consistent with what she knows. Users can send files.

1. **MemorySaveCard** — replace the `MemoryHint` banner and `SaveInsightButton` with a proactive confirmation card after each answer turn (only when saveable content detected). Shows scope suggestion (👤 / 🏢) derived from category heuristic.
2. **Recall UX** — replace plain-text recall render with `MemoryCard` components. Show scope badge, timestamp, category. Add "Im Memory öffnen" one-click.
3. **Memory basis panel** — show which memories informed the answer, with "Warum?" expandable detail. (The backend already signals `answer_source === 'memory'`; `relevantMemories` are already fetched.)
4. **Attachment drop target** — file drop + image paste → sends to backend. Requires CORE 6.2 above.
5. **File attachment preview** — thumbnail/name chip in the input area before send.

**CORE ask for Phase 2:** CORE 6.2 (attachment support) for attachments. Memory items (6.1–6.5) are frontend only.

### Phase 3 — Canvas, rich cards, async missions (2 weeks)

**Goal:** Mora responds with structured visual output, not just text.

1. **CanvasWidget** — render `canvas` SSE frames as chart/table/timeline. Start with the two most common types: bar chart, markdown table.
2. **Result card library** — `SearchResultCard`, `CreatedNodeCard`, `MailDraftCard`, `CalendarCard`. Each card type corresponds to a known tool result shape.
3. **MissionCard** — background task progress in thread. Toggle "Im Hintergrund" on the input bar.
4. **Communication context** — confirm `useCommunicationLiveData` and `buildCommunicationOperationalContextMessage` are live and accurate for authenticated users (currently depends on 4.7/4.8 mail+calendar sync).

**CORE ask for Phase 3:** CORE 6.3 (canvas frames), 6.4 (missions), and 4.7/4.8 (mail+calendar) for communication context.

### Phase 4 — Deep-work mode / OpenClaw integration (deferred)

Blocked on the OpenClaw hybrid spike (see `mora-capability-architecture.md` §6). Scope:
- Fan-out to specialist sub-agents (strategy / research / code / ops)
- Show sub-agent steps as expandable cards in the thread
- Owner-tier tool access (exec / ops / Hetzner) behind explicit confirmation

Not estimated — requires the OpenClaw gateway to be stood up first.

---

## 8. Test plan

### Unit tests (TDD — tests written first)

- `routing.ts` — intent classification for navigation / search / recall / chat / agent
- `ToolTraceCard` — renders success, fail, pending states
- `MemorySaveCard` — proactive offer, scope suggestion, confirm/dismiss
- `ChatScopeBar` — breadcrumb render from MoraContextSnapshot, scope picker interaction
- `useChat.ts` — message append, streaming state, error states

### Integration tests

- Stream end-to-end with mock SSE server: token frames → full message committed
- Agent loop with iteration trace: 3 tools → 3 ToolTraceCards rendered
- Recall intent: keyword → `fetchMoraMemories` called, no agent call, MemoryCards rendered
- Attachment: file dropped → upload request fired, attachment chip shown

### Manual smoke

- Open chat with no company (setup-required state) → `SetupRequiredCard` shown
- Stream + then type next message before stream done → previous stream aborted cleanly
- Fullscreen mode → ESC exits, `mora-pane-fullscreen-change` event fired
- Demo visitor mode (`activeMode === 'visitor'`) → perception bundle not fetched, memory save disabled

---

## 9. Out of scope (this spec)

- VAPI / phone (AmbientRoom) — project rule: untouched
- Multi-tenancy — single-company-per-deployment stands
- Mora tone / phrasing adaptation (Jarvis Spec 4 — Outcome Feedback)
- Cross-surface memory (Jarvis Spec 2)
- Proactive triggers / event bus (Jarvis Spec 3)
- OpenClaw deep-work fan-out (Jarvis Spec 5 / Roadmap Phase 4 here)

---

## 10. Decision required from user

1. **Phase 1 first-cut scope:** Does the component split (§5) come before the ToolTraceCard, or together in one sprint?
2. **Routing simplification (Phase 1.5):** Remove client-side `shouldPreferAgenticLoop` keyword heuristic and let the backend model decide? This requires CORE to handle tool decisions in the streaming endpoint — confirm CORE's `/v3/chat/stream` model supports tool use natively.
3. **Canvas frame types:** Which two chart types to implement first? Bar chart + markdown table, or bar chart + timeline?
4. **Attachment model:** File-as-base64 in JSON body (simpler frontend, larger payload), or multipart form (proper but more complex)? For large PDFs, multipart is required.
5. **MoraDialogueV1 flag:** Is the frame stream stable enough to remove the flag and enable for all users in Phase 1?

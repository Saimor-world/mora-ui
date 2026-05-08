# Sprint 2 — Mora Awareness (Context Injection + Mora-speaks)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Mora soll spürbar wissen, wo der User gerade ist und was los ist. Zwei Bausteine:
1. **Context Injection** — jede Mora-Anfrage bekommt automatisch Workspace-Kontext (Company, Department, letzte Aktivitäten, Zeit, ungelesene Signale)
2. **Mora-speaks** — bei `urgent`-Tier KAIROS-Signalen öffnet sich der Chat-Dock automatisch und Mora schreibt das Signal als erste Message proaktiv

**Architecture:**
- **CORE**: Erweiterung des AgenticLoop um einen `WorkspaceContextBuilder` der vor S1_PERCEIVE den Context aus DB lädt und dem System-Prompt injiziert. Neue Tabelle `kairos_speak_queue` für proaktive Messages.
- **INTERFACE**: ChatStore lauscht auf neuen WebSocket-Event `mora.speaks` und öffnet ChatPane auto. Context-Indicator-Chip im ChatPane zeigt was Mora gerade „weiß".

**Tech Stack:** FastAPI (CORE), Next.js 15 + Zustand (INTERFACE), WebSocket realtime channel.

---

### Task 1 (CORE): WorkspaceContextBuilder

**Files:**
- Create: `core/cognition/workspace_context.py`
- Modify: `core/cognition/agentic.py`

- [ ] **Step 1: Failing Test schreiben**

```python
# core/tests/test_workspace_context.py
import pytest
from cognition.workspace_context import build_workspace_context

def test_builds_context_with_active_dept(test_db, sample_tenant):
    ctx = build_workspace_context(
        tenant_id=sample_tenant.id,
        user_id=sample_tenant.user_id,
        active_company_id="comp-1",
        active_department_id="dept-1",
        conn=test_db,
    )
    assert "comp-1" in ctx
    assert "Department:" in ctx
    assert "Recent activity:" in ctx
```

- [ ] **Step 2: Test laufen → FAIL**

```bash
cd C:/saimor/CORE && python -m pytest core/tests/test_workspace_context.py -x 2>&1 | tail -5
```

- [ ] **Step 3: workspace_context.py erstellen**

```python
"""
WorkspaceContextBuilder — assembles a compact context blurb for Mora.
Injected into the agentic loop's system prompt before S1_PERCEIVE.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional


def build_workspace_context(
    tenant_id: str,
    user_id: str,
    active_company_id: Optional[str],
    active_department_id: Optional[str],
    conn,
) -> str:
    """Return a multi-line context string for the LLM system prompt."""
    lines: list[str] = []
    now = datetime.now(timezone.utc)
    lines.append(f"Aktuelle Zeit (UTC): {now.isoformat()}")

    if active_company_id:
        row = conn.execute(
            "SELECT name FROM companies WHERE id=? AND tenant_id=?",
            (active_company_id, tenant_id),
        ).fetchone()
        if row:
            lines.append(f"Aktive Company: {row[0]} ({active_company_id})")

    if active_department_id:
        row = conn.execute(
            "SELECT name FROM departments WHERE id=? AND tenant_id=?",
            (active_department_id, tenant_id),
        ).fetchone()
        if row:
            lines.append(f"Department: {row[0]}")

    # Last 5 touched nodes for this user (from semantic_events)
    cutoff = (now - timedelta(days=2)).isoformat()
    try:
        recent = conn.execute(
            """
            SELECT entity_id, event_type, created_at
            FROM semantic_events
            WHERE tenant_id=? AND user_id=? AND created_at > ?
            ORDER BY created_at DESC LIMIT 5
            """,
            (tenant_id, user_id, cutoff),
        ).fetchall()
        if recent:
            lines.append("Letzte Aktivitäten:")
            for entity_id, evt, ts in recent:
                lines.append(f"  - {evt} on {entity_id} ({ts})")
    except Exception:
        pass

    # Unread KAIROS signals
    try:
        sig_rows = conn.execute(
            """
            SELECT title, tier FROM kairos_signals
            WHERE tenant_id=? AND status='pending'
            ORDER BY created_at DESC LIMIT 3
            """,
            (tenant_id,),
        ).fetchall()
        if sig_rows:
            lines.append("Offene Signale:")
            for title, tier in sig_rows:
                lines.append(f"  - [{tier}] {title}")
    except Exception:
        pass

    return "\n".join(lines)
```

- [ ] **Step 4: AgenticLoop System-Prompt erweitern**

In `core/cognition/agentic.py`, finde wo der system_prompt zusammengebaut wird (vermutlich in der `run()` oder `_build_messages()` Methode). Suche:

```bash
grep -n "system_prompt\|system_message\|system_instructions" core/cognition/agentic.py | head -10
```

Vor dem LLM-Call Context injizieren:
```python
from cognition.workspace_context import build_workspace_context

# In der run()-Methode, vor S1_PERCEIVE:
workspace_ctx = build_workspace_context(
    tenant_id=tenant_id,
    user_id=user_id,
    active_company_id=request.active_company_id,
    active_department_id=request.active_department_id,
    conn=db_conn,
)
system_prompt = f"{base_system_prompt}\n\n## Workspace-Kontext\n{workspace_ctx}"
```

`active_company_id` und `active_department_id` müssen aus dem Request-Body kommen — falls die `ChatRequest` Pydantic-Model das nicht hat, ergänzen.

- [ ] **Step 5: Tests laufen**

```bash
python -m pytest core/tests/test_workspace_context.py core/tests/test_cognition*.py -x 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/CORE && git add core/cognition/workspace_context.py core/cognition/agentic.py core/tests/test_workspace_context.py
git commit -m "feat(cognition): inject workspace context into Mora system prompt"
```

---

### Task 2 (INTERFACE): Active Context aus Request mitschicken

**Files:**
- Modify: `lib/api/cognitionClient.ts`
- Modify: aufrufende Stellen (ChatPane / Dock)

- [ ] **Step 1: cognitionClient erweitern**

```bash
grep -n "executeAgentic\|/v3/cognition\|chatRequest" C:/saimor/INTERFACE/lib/api/cognitionClient.ts | head -10
```

Im Request-Body zusätzlich senden:
```typescript
import { useNavStore } from '@/lib/store/navStore';

// In der executeAgenticLoop / sendMessage-Funktion:
const navState = useNavStore.getState();
body.active_company_id = navState.activeCompanyId;
body.active_department_id = navState.activeDepartmentId;
```

(Wenn die Funktion außerhalb React-Render-Cycle läuft, ist `useNavStore.getState()` ok — sonst Hook-Wert reichen.)

- [ ] **Step 2: Tests + TS-Check**

```bash
cd C:/saimor/INTERFACE && npx tsc --noEmit 2>&1 | grep cognition | head -5
npx jest --no-coverage --testPathPattern="cognition" 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add lib/api/cognitionClient.ts
git commit -m "feat(chat): send active company + department context to Mora"
```

---

### Task 3 (INTERFACE): ChatPane Context-Chip zeigt was Mora weiß

**Files:**
- Modify: `components/mora/MoraContextChip.tsx` (existiert bereits)

- [ ] **Step 1: Aktuellen Inhalt lesen**

```bash
cat C:/saimor/INTERFACE/components/mora/MoraContextChip.tsx | head -80
```

- [ ] **Step 2: Erweitern um Awareness-Indikator**

Wenn ein aktiver Department-Kontext existiert, zeige einen kleinen pulsierenden Smaragd-Punkt + Text „Mora kennt: [Dept-Name]". Hover öffnet einen Tooltip mit den letzten 3 Activity-Items.

```tsx
// Im bestehenden Chip-Render:
{activeDepartment && (
    <span className="flex items-center gap-1 text-[10px] text-emerald-300/72">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        weiß: {activeDepartment.name}
    </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/mora/MoraContextChip.tsx
git commit -m "feat(chat): context chip shows what Mora is aware of"
```

---

### Task 4 (CORE): Mora-speaks Queue + Hook für urgent Signals

**Files:**
- Create: `core/kairos/speak_queue.py`
- Modify: `core/kairos/signal_hooks.py` (oder wo Signale dispatched werden)
- Modify: `core/api/v3/endpoints/mora_radar.py` (oder wo der Radar-Endpoint ist)

- [ ] **Step 1: Failing Test**

```python
# core/tests/test_speak_queue.py
def test_urgent_signal_queues_speak(test_db, sample_tenant):
    from kairos.signal_hooks import dispatch_signal
    from kairos.speak_queue import get_pending_speaks

    dispatch_signal(
        tenant_id=sample_tenant.id,
        signal_type="HotDocumentRule",
        title="Test urgent",
        body="„Doc" ist im Flow.",
        tier="urgent",
        conn=test_db,
    )

    speaks = get_pending_speaks(sample_tenant.id, test_db)
    assert len(speaks) == 1
    assert speaks[0]["tier"] == "urgent"
```

- [ ] **Step 2: speak_queue.py erstellen**

```python
"""
MoraSpeakQueue — proactive messages Mora wants to deliver.
Created when KAIROS dispatches an urgent-tier signal.
Frontend pulls via WebSocket event 'mora.speaks' or polls.
"""
from __future__ import annotations
from datetime import datetime, timezone


def _ensure_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mora_speak_queue (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            user_id TEXT,
            signal_id TEXT,
            tier TEXT NOT NULL,
            message TEXT NOT NULL,
            entity_id TEXT,
            entity_type TEXT,
            created_at TEXT NOT NULL,
            delivered_at TEXT
        )
    """)


def queue_speak(
    tenant_id: str,
    signal_id: str,
    tier: str,
    message: str,
    user_id: str | None,
    entity_id: str | None,
    entity_type: str | None,
    conn,
) -> str:
    _ensure_table(conn)
    import uuid
    speak_id = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO mora_speak_queue
        (id, tenant_id, user_id, signal_id, tier, message, entity_id, entity_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (speak_id, tenant_id, user_id, signal_id, tier, message, entity_id, entity_type,
         datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    return speak_id


def get_pending_speaks(tenant_id: str, conn) -> list[dict]:
    _ensure_table(conn)
    rows = conn.execute(
        """SELECT id, tier, message, entity_id, entity_type, created_at
           FROM mora_speak_queue
           WHERE tenant_id=? AND delivered_at IS NULL
           ORDER BY created_at ASC""",
        (tenant_id,),
    ).fetchall()
    return [{
        "id": r[0], "tier": r[1], "message": r[2],
        "entity_id": r[3], "entity_type": r[4], "created_at": r[5],
    } for r in rows]


def mark_delivered(speak_id: str, conn) -> None:
    conn.execute(
        "UPDATE mora_speak_queue SET delivered_at=? WHERE id=?",
        (datetime.now(timezone.utc).isoformat(), speak_id),
    )
    conn.commit()
```

- [ ] **Step 3: Hook in dispatch_signal**

In `core/kairos/signal_hooks.py`:
```python
from kairos.speak_queue import queue_speak

# In dispatch_signal, nach DB-Insert des signals:
if tier == "urgent":
    queue_speak(
        tenant_id=tenant_id,
        signal_id=signal.id,
        tier=tier,
        message=f"{signal.title}: {signal.body}",
        user_id=None,  # broadcast to all users of tenant
        entity_id=entity_id,
        entity_type=entity_type,
        conn=conn,
    )
    # Broadcast via realtime channel
    from realtime.channel import broadcast
    broadcast(tenant_id, "mora.speaks", { "tier": tier, "message": ..., ... })
```

(Anpassen an existierenden realtime/broadcast-Code in `core/realtime/`.)

- [ ] **Step 4: API-Endpoint zum Pollen + Acken**

In `core/api/v3/endpoints/mora_radar.py` ergänzen:
```python
@router.get("/speaks/pending")
def list_pending_speaks(token=Depends(...)):
    # ... return get_pending_speaks(tenant_id, conn)

@router.post("/speaks/{speak_id}/ack")
def ack_speak(speak_id: str, token=Depends(...)):
    # ... mark_delivered(speak_id, conn)
```

- [ ] **Step 5: Tests + Commit**

```bash
python -m pytest core/tests/test_speak_queue.py -x 2>&1 | tail -5

git add core/kairos/speak_queue.py core/kairos/signal_hooks.py core/api/v3/endpoints/mora_radar.py core/tests/test_speak_queue.py
git commit -m "feat(kairos): mora speak queue for urgent-tier proactive messages"
```

---

### Task 5 (INTERFACE): Lauscher auf mora.speaks → Auto-Open Chat

**Files:**
- Modify: `lib/api/realtimeClient.ts` (Event registrieren)
- Modify: `lib/store/chatStore.ts` (Auto-Open + Inject)
- Create: `lib/queries/useMoraSpeaks.ts` (Polling-Fallback)

- [ ] **Step 1: realtimeClient erweitern**

In `lib/api/realtimeClient.ts`, in `getDesiredEventTypes()` `'mora.speaks'` ergänzen.

- [ ] **Step 2: Hook für mora.speaks**

```typescript
// lib/queries/useMoraSpeaks.ts
'use client';
import { useEffect } from 'react';
import { realtimeClient } from '@/lib/api/realtimeClient';
import { useChatStore } from '@/lib/store/chatStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/http';

export function useMoraSpeaks() {
    const injectMessage = useChatStore((s) => s.injectMessage);
    const openPane = usePaneStore((s) => s.openPane);

    useEffect(() => {
        const handler = (event: any) => {
            const { id, message, tier, entity_id, entity_type } = event.payload ?? {};
            if (!message) return;

            // Open chat pane if not already
            openPane({
                id: 'mora-chat',
                type: 'chat',
                title: 'Mora',
                size: { width: 460, height: 620 },
                data: { autoOpened: true },
            });

            // Inject as if Mora said it
            injectMessage({
                role: 'assistant',
                content: message,
                meta: { tier, entity_id, entity_type, source: 'mora.speaks' },
            });

            // Ack
            corePost(`/v3/mora/radar/speaks/${id}/ack`, {});
        };
        return realtimeClient.subscribe('mora.speaks', handler);
    }, [injectMessage, openPane]);
}
```

`useChatStore.injectMessage` ggf. ergänzen wenn nicht vorhanden — siehe `lib/store/chatStore.ts`.

- [ ] **Step 3: In MoraShell mounten**

```tsx
// In MoraShell:
useMoraSpeaks();
```

- [ ] **Step 4: Test mit gefakter Signal**

```bash
# Im CORE einen test-urgent-signal posten:
curl -X POST http://localhost:8081/v3/mora/radar/test-urgent \
  -H "Authorization: Bearer ..." \
  -d '{"title":"Test urgent","body":"„Demo-Doc" ist im Flow."}'
```

(Optional: Test-Endpoint in dev-mode für demo-fähigkeit anlegen.)

Frontend sollte: Chat-Pane auto-öffnen mit der Message.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/useMoraSpeaks.ts lib/api/realtimeClient.ts lib/store/chatStore.ts components/os/shell/MoraShell.tsx
git commit -m "feat(chat): auto-open chat pane when Mora speaks (urgent signals)"
```

---

## Success Criteria

1. Mora-Anfragen kennen den aktiven Department/Company-Kontext (im LLM-Prompt sichtbar in CORE-Logs)
2. Bei urgent-Tier Signal öffnet sich Chat-Pane automatisch mit Mora-Message als Bubble
3. ChatPane-Context-Chip zeigt „weiß: [Dept]" wenn aktiv
4. Frontend ack't Speak via API → kein Doppel-Display bei Reload
5. CORE-Tests grün (`pytest`)
6. INTERFACE-Tests grün (`jest`), keine TS-Errors

---

## Demo-Trick

Für eine Live-Demo: einen Demo-Endpoint `POST /v3/dev/trigger-urgent` der einen synthetic urgent Signal fired. Während der Demo: Klick auf den Endpoint → Chat-Pane springt auf, Mora redet. Wow-Moment.

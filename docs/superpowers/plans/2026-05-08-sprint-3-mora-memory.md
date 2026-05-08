# Sprint 3 — Mora Memory (Episodic + Semantic Recall)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Mora erinnert sich. Jede Konversation wird zu einem komprimierten Memory-Node mit Embedding. Bei der nächsten Anfrage findet Mora ähnliche frühere Konversationen via Cosine-Similarity und nimmt sie in den Context. Das ist das Feature, das aus „Chatbot mit Tools" → „kennt mich"-Gefühl macht.

**Architecture:**
- **CORE**:
  - Neue Tabelle `mora_memories` (id, tenant_id, user_id, summary, entities_json, embedding, sentiment, created_at)
  - Embedding-Service (lokal via sentence-transformers oder API-Call zu Provider)
  - `MemoryRecall`-Pipeline: bei Mora-Anfrage Top-3 ähnliche Memories als Context laden
  - `MemoryWriter`: nach Konversations-Ende (oder periodisch) Summary + Embedding generieren und persistieren
- **INTERFACE**:
  - Memory-Tab im ChatPane mit Suchfeld
  - „Mora erinnert sich"-Indicator in Chat wenn ein Memory gehoben wurde

**Tech Stack:** FastAPI + sentence-transformers (CORE), Next.js + TanStack Query (INTERFACE), SQLite mit BLOB-Spalte für Embeddings.

---

### Task 1 (CORE): mora_memories Tabelle + Migration

**Files:**
- Create: `core/database/migrations/0XX_mora_memories.py` (Nummer an aktuelle Migration anpassen)
- Modify: `core/database/__init__.py` falls Migration-Registrierung dort

- [ ] **Step 1: Aktuelle höchste Migration finden**

```bash
ls C:/saimor/CORE/core/database/migrations/ | sort | tail -5
```

- [ ] **Step 2: Migration-Datei erstellen**

```python
# core/database/migrations/0XX_mora_memories.py
def up(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mora_memories (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            entities_json TEXT,
            embedding BLOB,
            sentiment TEXT,
            source_conversation_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_mora_memories_tenant_user
        ON mora_memories(tenant_id, user_id, created_at DESC)
    """)
    conn.commit()


def down(conn):
    conn.execute("DROP INDEX IF EXISTS idx_mora_memories_tenant_user")
    conn.execute("DROP TABLE IF EXISTS mora_memories")
    conn.commit()
```

- [ ] **Step 3: Migration registrieren + ausführen**

```bash
cd C:/saimor/CORE && python -m alembic upgrade head 2>&1 | tail -5
# oder: python scripts/run_migrations.py
```

(Konkretes Migration-Tool aus `core/database/migrations/__init__.py` ablesen.)

- [ ] **Step 4: Commit**

```bash
git add core/database/migrations/0XX_mora_memories.py
git commit -m "feat(memory): mora_memories table for episodic memory"
```

---

### Task 2 (CORE): Embedding Service

**Files:**
- Create: `core/cognition/embedding.py`
- Modify: `requirements.txt` falls sentence-transformers fehlt

- [ ] **Step 1: Failing Test**

```python
# core/tests/test_embedding.py
from cognition.embedding import embed_text, cosine_similarity
import numpy as np

def test_embed_returns_vector():
    v = embed_text("Hello world")
    assert isinstance(v, np.ndarray)
    assert v.shape[0] >= 128  # any reasonable embedding dim

def test_similar_texts_have_high_similarity():
    a = embed_text("Mora kann gut zuhören")
    b = embed_text("Mora hört aufmerksam zu")
    c = embed_text("Pizza schmeckt gut")
    assert cosine_similarity(a, b) > cosine_similarity(a, c)
```

- [ ] **Step 2: Test laufen → FAIL**

- [ ] **Step 3: embedding.py erstellen**

```python
"""
Embedding-Service für Mora Memory.
Lokales Modell (sentence-transformers) — keine externe API-Abhängigkeit.
Modell: paraphrase-multilingual-MiniLM-L12-v2 (~470MB, mehrsprachig DE+EN)
"""
from __future__ import annotations
import numpy as np
import threading

_model = None
_model_lock = threading.Lock()


def _load_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    return _model


def embed_text(text: str) -> np.ndarray:
    model = _load_model()
    vec = model.encode(text, normalize_embeddings=True)
    return np.asarray(vec, dtype=np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    # vectors are normalized → dot product = cosine
    return float(np.dot(a, b))


def serialize_embedding(vec: np.ndarray) -> bytes:
    return vec.astype(np.float32).tobytes()


def deserialize_embedding(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)
```

- [ ] **Step 4: requirements.txt prüfen**

```bash
grep "sentence-transformers" C:/saimor/CORE/requirements.txt
```

Falls fehlt:
```
sentence-transformers>=2.7.0
```

- [ ] **Step 5: Test → PASS**

```bash
cd C:/saimor/CORE && python -m pytest core/tests/test_embedding.py -x 2>&1 | tail -5
```

(Beim ersten Run lädt das Modell ~470MB nach `~/.cache/huggingface/`. Das ist ok lokal.)

- [ ] **Step 6: Commit**

```bash
git add core/cognition/embedding.py requirements.txt core/tests/test_embedding.py
git commit -m "feat(cognition): local sentence-transformers embedding service"
```

---

### Task 3 (CORE): MemoryWriter — Konversation → Memory

**Files:**
- Create: `core/cognition/memory_writer.py`
- Modify: `core/cognition/agentic.py` (nach Konversations-Ende write_memory triggern)

- [ ] **Step 1: Failing Test**

```python
# core/tests/test_memory_writer.py
def test_writes_memory_with_summary_and_embedding(test_db, sample_tenant):
    from cognition.memory_writer import write_memory_from_messages

    messages = [
        {"role": "user", "content": "Mora, was steht heute an?"},
        {"role": "assistant", "content": "3 Mails warten und Standup um 10."},
    ]
    memory_id = write_memory_from_messages(
        tenant_id=sample_tenant.id,
        user_id=sample_tenant.user_id,
        conversation_id="conv-1",
        messages=messages,
        conn=test_db,
    )
    assert memory_id

    row = test_db.execute(
        "SELECT summary, embedding FROM mora_memories WHERE id=?", (memory_id,)
    ).fetchone()
    assert row[0]  # summary
    assert row[1]  # embedding bytes
```

- [ ] **Step 2: memory_writer.py erstellen**

```python
"""
MemoryWriter — komprimiert eine Konversation in einen Memory-Node mit Embedding.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
import uuid

from cognition.embedding import embed_text, serialize_embedding


def _summarize_conversation(messages: list[dict]) -> str:
    """V1: simple concat of first user msg + last assistant. V2: LLM-summary."""
    user_msgs = [m["content"] for m in messages if m.get("role") == "user"]
    assistant_msgs = [m["content"] for m in messages if m.get("role") == "assistant"]
    parts = []
    if user_msgs:
        parts.append(f"User fragte: {user_msgs[0][:200]}")
    if assistant_msgs:
        parts.append(f"Mora antwortete: {assistant_msgs[-1][:300]}")
    return " | ".join(parts)


def _extract_entities(messages: list[dict]) -> list[str]:
    """V1: dummy. V2: NER via spaCy or LLM."""
    return []


def write_memory_from_messages(
    tenant_id: str,
    user_id: str,
    conversation_id: str,
    messages: list[dict],
    conn,
) -> str:
    summary = _summarize_conversation(messages)
    if not summary.strip():
        return ""

    entities = _extract_entities(messages)
    embedding_vec = embed_text(summary)
    embedding_bytes = serialize_embedding(embedding_vec)

    memory_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO mora_memories
        (id, tenant_id, user_id, summary, entities_json, embedding,
         source_conversation_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (memory_id, tenant_id, user_id, summary, json.dumps(entities),
         embedding_bytes, conversation_id, now),
    )
    conn.commit()
    return memory_id
```

- [ ] **Step 3: Hook in agentic.py**

In der Run-Methode, nach S6_REPORT (Konversations-Ende):
```python
from cognition.memory_writer import write_memory_from_messages

# Nach final_response erstellt:
try:
    write_memory_from_messages(
        tenant_id=tenant_id,
        user_id=user_id,
        conversation_id=request.conversation_id,
        messages=conversation_messages,
        conn=db_conn,
    )
except Exception as e:
    logger.warning(f"Memory write failed: {e}")
    # Don't break the response
```

- [ ] **Step 4: Tests + Commit**

```bash
python -m pytest core/tests/test_memory_writer.py -x 2>&1 | tail -5

git add core/cognition/memory_writer.py core/cognition/agentic.py core/tests/test_memory_writer.py
git commit -m "feat(memory): write memory_node after each Mora conversation"
```

---

### Task 4 (CORE): MemoryRecall — Top-3 ähnliche Memories laden

**Files:**
- Create: `core/cognition/memory_recall.py`
- Modify: `core/cognition/agentic.py` (vor S1 Recall-Memories in System-Prompt)

- [ ] **Step 1: Failing Test**

```python
# core/tests/test_memory_recall.py
def test_recalls_similar_memories(test_db, sample_tenant):
    from cognition.memory_writer import write_memory_from_messages
    from cognition.memory_recall import recall_similar_memories

    # Seed three memories
    write_memory_from_messages(sample_tenant.id, sample_tenant.user_id, "c1", [
        {"role": "user", "content": "Was ist mit dem Marketing-Budget?"},
        {"role": "assistant", "content": "Aktuell 50k EUR allokiert."},
    ], test_db)
    write_memory_from_messages(sample_tenant.id, sample_tenant.user_id, "c2", [
        {"role": "user", "content": "Pizza-Bestellung für Team-Lunch?"},
        {"role": "assistant", "content": "Standardlieferant ist Pizzeria Bella."},
    ], test_db)
    write_memory_from_messages(sample_tenant.id, sample_tenant.user_id, "c3", [
        {"role": "user", "content": "Wieviel Geld haben wir fürs Marketing?"},
        {"role": "assistant", "content": "Letzte Antwort: 50k."},
    ], test_db)

    # Query similar to c1 + c3 (Marketing-Budget)
    results = recall_similar_memories(
        tenant_id=sample_tenant.id,
        user_id=sample_tenant.user_id,
        query="Marketing Budget Status?",
        top_k=2,
        conn=test_db,
    )
    assert len(results) == 2
    # c1 and c3 should rank above c2
    summaries = [r["summary"] for r in results]
    assert any("Marketing" in s for s in summaries)
```

- [ ] **Step 2: memory_recall.py erstellen**

```python
"""
MemoryRecall — finde Top-K ähnliche Memories via Cosine-Similarity.
"""
from __future__ import annotations
from cognition.embedding import embed_text, cosine_similarity, deserialize_embedding


def recall_similar_memories(
    tenant_id: str,
    user_id: str,
    query: str,
    top_k: int,
    conn,
    similarity_threshold: float = 0.35,
) -> list[dict]:
    query_vec = embed_text(query)

    rows = conn.execute(
        """SELECT id, summary, embedding, created_at
           FROM mora_memories
           WHERE tenant_id=? AND user_id=?
           ORDER BY created_at DESC
           LIMIT 200""",  # cap to most recent 200 for performance
        (tenant_id, user_id),
    ).fetchall()

    scored = []
    for row in rows:
        if not row[2]:
            continue
        mem_vec = deserialize_embedding(row[2])
        sim = cosine_similarity(query_vec, mem_vec)
        if sim >= similarity_threshold:
            scored.append({
                "id": row[0],
                "summary": row[1],
                "similarity": sim,
                "created_at": row[3],
            })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]
```

- [ ] **Step 3: In agentic.py vor LLM-Call injizieren**

```python
from cognition.memory_recall import recall_similar_memories

# Vor S1_PERCEIVE:
recalled = recall_similar_memories(
    tenant_id=tenant_id,
    user_id=user_id,
    query=request.message,
    top_k=3,
    conn=db_conn,
)

if recalled:
    memory_ctx = "## Erinnerungen aus früheren Gesprächen\n"
    for m in recalled:
        memory_ctx += f"- ({m['created_at']}, sim {m['similarity']:.2f}) {m['summary']}\n"
    system_prompt = f"{system_prompt}\n\n{memory_ctx}"

    # Auch im Response zurückgeben für UI-Indicator
    response_meta["recalled_memories"] = [m["id"] for m in recalled]
```

- [ ] **Step 4: Tests + Commit**

```bash
python -m pytest core/tests/test_memory_recall.py -x 2>&1 | tail -5

git add core/cognition/memory_recall.py core/cognition/agentic.py core/tests/test_memory_recall.py
git commit -m "feat(memory): semantic recall of top-3 similar memories per Mora query"
```

---

### Task 5 (CORE): Memory API Endpoints (List + Search)

**Files:**
- Create: `core/api/v3/endpoints/memory.py`
- Modify: `core/api/v3/api.py` (Router-Registrierung)

- [ ] **Step 1: Endpoints**

```python
# core/api/v3/endpoints/memory.py
from fastapi import APIRouter, Depends, Query
from security import get_current_user_token
from database import db_session

router = APIRouter()


@router.get("/list")
def list_memories(
    limit: int = Query(50, le=200),
    offset: int = 0,
    token=Depends(get_current_user_token),
):
    tenant_id = token["tenant_id"]
    user_id = token.get("sub") or token.get("user_id")
    with db_session() as conn:
        rows = conn.execute(
            """SELECT id, summary, created_at FROM mora_memories
               WHERE tenant_id=? AND user_id=?
               ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            (tenant_id, user_id, limit, offset),
        ).fetchall()
    return {
        "data": [
            {"id": r[0], "summary": r[1], "created_at": r[2]}
            for r in rows
        ],
        "meta": {"api_version": "v3"},
    }


@router.get("/search")
def search_memories(
    q: str = Query(..., min_length=2),
    top_k: int = Query(10, le=30),
    token=Depends(get_current_user_token),
):
    from cognition.memory_recall import recall_similar_memories
    tenant_id = token["tenant_id"]
    user_id = token.get("sub") or token.get("user_id")
    with db_session() as conn:
        results = recall_similar_memories(
            tenant_id=tenant_id, user_id=user_id, query=q,
            top_k=top_k, conn=conn,
        )
    return {"data": results, "meta": {"api_version": "v3"}}
```

- [ ] **Step 2: Router registrieren**

In `core/api/v3/api.py` ergänzen:
```python
from .endpoints import memory as memory_router
api_router.include_router(memory_router.router, prefix="/memory", tags=["memory"])
```

- [ ] **Step 3: Commit**

```bash
git add core/api/v3/endpoints/memory.py core/api/v3/api.py
git commit -m "feat(memory): v3 endpoints for memory list + semantic search"
```

---

### Task 6 (INTERFACE): Memory-Tab im ChatPane

**Files:**
- Create: `lib/queries/useMemories.ts`
- Create: `lib/api/memoryClient.ts`
- Modify: `apps/chat/index.tsx` (oder ChatPane Komponente)

- [ ] **Step 1: API-Client + Query-Hook**

```typescript
// lib/api/memoryClient.ts
import { coreGet } from './http';

export interface MoraMemory {
    id: string;
    summary: string;
    created_at: string;
    similarity?: number;
}

export async function fetchMemories(limit = 50): Promise<MoraMemory[] | null> {
    return coreGet(`/v3/memory/list?limit=${limit}`, { isOptional: true });
}

export async function searchMemories(query: string, topK = 10): Promise<MoraMemory[] | null> {
    return coreGet(`/v3/memory/search?q=${encodeURIComponent(query)}&top_k=${topK}`, { isOptional: true });
}
```

```typescript
// lib/queries/useMemories.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchMemories, searchMemories } from '@/lib/api/memoryClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useMemories(limit = 50) {
    return useQuery({
        queryKey: ['memories', 'list', limit],
        queryFn: () => fetchMemories(limit),
        staleTime: 60 * 1000,
    });
}

export function useMemorySearch(query: string) {
    return useQuery({
        queryKey: ['memories', 'search', query],
        queryFn: () => searchMemories(query),
        enabled: query.length >= 2,
        staleTime: 30 * 1000,
    });
}
```

- [ ] **Step 2: Tab im ChatPane**

In `apps/chat/index.tsx` einen Tab-Switch hinzufügen: „Chat" / „Erinnerungen". Im Erinnerungen-Tab eine Liste mit Suchfeld.

```tsx
const [view, setView] = useState<'chat' | 'memories'>('chat');
// ... Tab-Bar oben:
<div className="flex gap-2 border-b border-white/[0.06] px-4">
    <button onClick={() => setView('chat')} className={view === 'chat' ? 'text-white/90' : 'text-white/40'}>Chat</button>
    <button onClick={() => setView('memories')} className={view === 'memories' ? 'text-white/90' : 'text-white/40'}>Erinnerungen</button>
</div>
{view === 'chat' ? <ChatView ... /> : <MemoriesView />}
```

`MemoriesView` als kleine Komponente unten in der Datei: Suchfeld + Liste, jedes Item klickbar (Detail-Modal mit voller Zusammenfassung).

- [ ] **Step 3: „Mora erinnert sich"-Indicator im Chat**

Wenn die LLM-Response Meta-Feld `recalled_memories` hat (siehe Task 4), zeige eine kleine Smaragd-Pille über der Message:

```tsx
{message.meta?.recalled_memories?.length > 0 && (
    <div className="mb-1 inline-flex items-center gap-1 text-[10px] text-emerald-300/72">
        <Sparkles size={10} />
        Mora erinnert sich an {message.meta.recalled_memories.length} Gespräch(e)
    </div>
)}
```

- [ ] **Step 4: TS-Check + Tests**

```bash
cd C:/saimor/INTERFACE && npx tsc --noEmit 2>&1 | grep -iE "memor|chat" | head -5
npx jest --no-coverage --testPathPattern="memor|chat" 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/memoryClient.ts lib/queries/useMemories.ts apps/chat/index.tsx
git commit -m "feat(chat): memories tab + recall indicator in chat messages"
```

---

## Success Criteria

1. Jede beendete Mora-Konversation erzeugt einen Memory-Node (DB-Tabelle füllt sich)
2. Bei Folge-Frage zu ähnlichem Thema: Mora-Response enthält Recall-Hinweis im Meta-Feld
3. Frontend zeigt „Mora erinnert sich an X Gespräch(e)" über Mora-Bubble
4. Memory-Tab listet alle Erinnerungen, Suchfeld findet semantisch ähnliche
5. CORE-Tests grün, INTERFACE-Tests grün
6. Embedding-Modell lädt einmal beim Server-Start (~5s), danach <50ms pro Embed

---

## Demo-Trick

Skript für Demo:
1. Login → mit Mora chatten: „Was ist unser Marketing-Budget für Q3?" → Antwort.
2. Chat schließen.
3. Neuer Chat: „Hey was war nochmal zum Marketing?" → Mora sollte mit Recall-Indicator antworten und auf den vorigen Chat referenzieren.

Wenn das funktioniert: aus „dummer Chatbot" → „kennt mich"-Erlebnis. Das ist der Game-Changer-Moment für Interessenten.

---

## Risiken & Notes

- **Embedding-Modell-Größe**: 470MB im Container. Falls zu groß für Hetzner-Setup, Fallback auf Provider-Embedding-API (Anthropic/Gemini).
- **Privacy**: Memories enthalten User-Content — nie cross-tenant zugreifen. Tests müssen Tenant-Isolation prüfen.
- **Memory-Drift**: nach 6 Monaten Memories archivieren oder zusammenfassen, sonst wird Recall langsam und unspezifisch (Phase 2).

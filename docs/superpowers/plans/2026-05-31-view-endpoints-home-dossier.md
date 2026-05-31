# View-Endpoints: Home + Dossier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Backend liefert anzeige-fertige Views (`/v3/views/home`, `/v3/views/dossier`); das Frontend rendert sie nur — keine Firmennamen-Fallback-Ketten, keine Geschäftslogik im Browser.

**Architecture:** View-Logik lebt in einer CORE-Service-Funktion (direkt testbar gegen SQLite), ein dünner v3-Router exponiert sie. Zwei Schichten: Fakten synchron (`/home`), Môra-Interpretation asynchron (`/home/insight`). Frontend bekommt fertige Strukturen über einen TanStack-Query-Hook. Strangler: Home zuerst (etabliert das Muster), Dossier erbt es.

**Tech Stack:** FastAPI · SQLite/Postgres · TanStack Query v5 · Zustand · Jest (no-mock: renderWithProviders + queryClient.setQueryData) · pytest (service-direct gegen SQLite)

---

## File Map

**Phase A — CORE: Home View (Fakten)**
- Create: `CORE/core/services/views_service.py` — `build_home_view(tenant_id, conn) -> dict` (reine Logik, testbar)
- Create: `CORE/core/api/v3/views.py` — dünner Router `GET /v3/views/home`, `GET /v3/views/home/insight`
- Modify: `CORE/core/app.py:335-360` — `views_v3_router` registrieren
- Test: `CORE/core/tests/test_views_service.py` — Service direkt gegen In-Memory-SQLite

**Phase B — CORE: Home Insight (Môra async)**
- Modify: `CORE/core/services/views_service.py` — `build_home_insight(tenant_id, conn) -> dict`
- Modify: `CORE/core/api/v3/views.py` — `/home/insight` füllt mit Cognition
- Test: `CORE/core/tests/test_views_service.py` — Insight-Fallback ohne LLM

**Phase C — INTERFACE: Home konsumiert View**
- Create: `INTERFACE/lib/queries/useHomeView.ts` — `useHomeView()` + `useHomeInsight()`
- Create: `INTERFACE/lib/queries/queryKeys.ts` Eintrag — `viewHome`, `viewHomeInsight`
- Modify: `INTERFACE/components/home/HomeSurface.tsx` — Firmenname aus View statt 4-Quellen-Kette
- Test: `INTERFACE/__tests__/lib/queries/useHomeView.test.tsx` — no-mock, echter QueryClient

**Phase D — Dossier View (erbt Muster)**
- Modify: `CORE/core/services/views_service.py` — `build_dossier_view(tenant_id, audit_id, conn) -> dict`
- Modify: `CORE/core/api/v3/views.py` — `GET /v3/views/dossier`
- Test: `CORE/core/tests/test_views_service.py` — Dossier-Fakten

---

## Phase A — CORE Home View (Fakten)

### Task 1: build_home_view service — company + greeting

**Files:**
- Create: `CORE/core/services/views_service.py`
- Test: `CORE/core/tests/test_views_service.py`

- [ ] **Step 1: Write the failing test**

Create `CORE/core/tests/test_views_service.py`:
```python
import sqlite3
import pytest
from services.views_service import build_home_view


def _conn():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE companies (
            id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, is_demo INTEGER DEFAULT 0
        );
        CREATE TABLE mindloop_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT,
            created_at TEXT, event_type TEXT, source TEXT,
            scope_type TEXT, scope_id TEXT, severity REAL, category TEXT,
            title TEXT, message TEXT, payload TEXT DEFAULT '{}'
        );
        CREATE TABLE nodes (
            id TEXT PRIMARY KEY, tenant_id TEXT, type TEXT, title TEXT,
            metadata TEXT DEFAULT '{}', created_at TEXT, updated_at TEXT
        );
    """)
    return conn


def test_home_view_returns_company_name_from_db():
    conn = _conn()
    conn.execute(
        "INSERT INTO companies (id, tenant_id, name) VALUES (?, ?, ?)",
        ("c1", "tenant-1", "Müller GmbH"),
    )
    view = build_home_view("tenant-1", conn)
    assert view["company"]["name"] == "Müller GmbH"
    assert view["company"]["is_visitor"] is False


def test_home_view_visitor_when_no_company():
    conn = _conn()
    view = build_home_view("tenant-unknown", conn)
    assert view["company"]["is_visitor"] is True
    assert view["company"]["name"] == ""
    assert view["changes"] == []
    assert view["attention"] == []
    assert view["next_steps"] == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.views_service'`

- [ ] **Step 3: Write minimal implementation**

Create `CORE/core/services/views_service.py`:
```python
"""
View services — backend assembles display-ready surfaces.
The frontend renders these; it does not compute display logic.
"""
from typing import Any, Dict


def _company(tenant_id: str, conn) -> Dict[str, Any]:
    row = conn.execute(
        "SELECT id, name FROM companies WHERE tenant_id = ? ORDER BY rowid ASC LIMIT 1",
        (tenant_id,),
    ).fetchone()
    if not row or not (row["name"] or "").strip():
        return {"id": None, "name": "", "is_visitor": True}
    return {"id": row["id"], "name": row["name"], "is_visitor": False}


def build_home_view(tenant_id: str, conn) -> Dict[str, Any]:
    company = _company(tenant_id, conn)
    if company["is_visitor"]:
        return {
            "company": company,
            "greeting": "",
            "changes": [],
            "attention": [],
            "next_steps": [],
        }
    return {
        "company": company,
        "greeting": "",
        "changes": [],
        "attention": [],
        "next_steps": [],
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/CORE
git add core/services/views_service.py core/tests/test_views_service.py
git commit -m "feat(core): build_home_view service — company identity + visitor detection"
```

---

### Task 2: build_home_view — the 3 questions (changes, attention, next_steps)

**Files:**
- Modify: `CORE/core/services/views_service.py`
- Test: `CORE/core/tests/test_views_service.py`

- [ ] **Step 1: Add the failing test**

Append to `CORE/core/tests/test_views_service.py`:
```python
def test_home_view_changes_sorted_by_time_desc():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    conn.executemany(
        "INSERT INTO mindloop_events (tenant_id, created_at, event_type, source, severity, category, title) VALUES (?,?,?,?,?,?,?)",
        [
            ("t1", "2026-05-01T10:00:00Z", "system", "s", 0.2, "hint", "Älter"),
            ("t1", "2026-05-30T10:00:00Z", "system", "s", 0.3, "trend", "Neuer"),
        ],
    )
    view = build_home_view("t1", conn)
    assert [c["title"] for c in view["changes"]] == ["Neuer", "Älter"]


def test_home_view_attention_sorted_by_severity_desc_and_filtered():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    conn.executemany(
        "INSERT INTO mindloop_events (tenant_id, created_at, event_type, source, severity, category, title) VALUES (?,?,?,?,?,?,?)",
        [
            ("t1", "2026-05-30T10:00:00Z", "potential_risk", "s", 0.9, "risk", "Hohes Risiko"),
            ("t1", "2026-05-30T09:00:00Z", "system", "s", 0.1, "hint", "Nur Hinweis"),
            ("t1", "2026-05-30T08:00:00Z", "system", "s", 0.5, "anomaly", "Anomalie"),
        ],
    )
    view = build_home_view("t1", conn)
    titles = [a["title"] for a in view["attention"]]
    assert titles == ["Hohes Risiko", "Anomalie"]  # hint excluded, severity desc


def test_home_view_next_steps_from_task_nodes():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    conn.executemany(
        "INSERT INTO nodes (id, tenant_id, type, title, created_at) VALUES (?,?,?,?,?)",
        [
            ("n1", "t1", "task", "Backup prüfen", "2026-05-30T10:00:00Z"),
            ("n2", "t1", "document", "Kein Task", "2026-05-30T10:00:00Z"),
        ],
    )
    view = build_home_view("t1", conn)
    titles = [s["title"] for s in view["next_steps"]]
    assert titles == ["Backup prüfen"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v`
Expected: FAIL — `changes`/`attention`/`next_steps` are empty `[]`

- [ ] **Step 3: Implement the three queries**

Replace `build_home_view` in `CORE/core/services/views_service.py`:
```python
ATTENTION_CATEGORIES = ("risk", "anomaly")


def _changes(tenant_id: str, conn) -> list:
    rows = conn.execute(
        """
        SELECT id, title, scope_type, scope_id, severity, category, created_at
        FROM mindloop_events
        WHERE tenant_id = ?
        ORDER BY created_at DESC
        LIMIT 10
        """,
        (tenant_id,),
    ).fetchall()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "scope": r["scope_type"],
            "occurred_at": r["created_at"],
            "severity": r["severity"],
        }
        for r in rows
    ]


def _attention(tenant_id: str, conn) -> list:
    placeholders = ",".join("?" for _ in ATTENTION_CATEGORIES)
    rows = conn.execute(
        f"""
        SELECT id, title, severity, category, scope_type
        FROM mindloop_events
        WHERE tenant_id = ? AND category IN ({placeholders})
        ORDER BY severity DESC
        LIMIT 10
        """,
        (tenant_id, *ATTENTION_CATEGORIES),
    ).fetchall()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "severity": r["severity"],
            "category": r["category"],
            "scope": r["scope_type"],
        }
        for r in rows
    ]


def _next_steps(tenant_id: str, conn) -> list:
    rows = conn.execute(
        """
        SELECT id, title, created_at
        FROM nodes
        WHERE tenant_id = ? AND type = 'task'
        ORDER BY created_at ASC
        LIMIT 10
        """,
        (tenant_id,),
    ).fetchall()
    return [
        {"id": r["id"], "title": r["title"], "source": "task"}
        for r in rows
    ]


def build_home_view(tenant_id: str, conn) -> Dict[str, Any]:
    company = _company(tenant_id, conn)
    if company["is_visitor"]:
        return {
            "company": company,
            "greeting": "",
            "changes": [],
            "attention": [],
            "next_steps": [],
        }
    return {
        "company": company,
        "greeting": "",
        "changes": _changes(tenant_id, conn),
        "attention": _attention(tenant_id, conn),
        "next_steps": _next_steps(tenant_id, conn),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/CORE
git add core/services/views_service.py core/tests/test_views_service.py
git commit -m "feat(core): home view — 3 questions (changes/attention/next_steps) from mindloop_events + task nodes"
```

---

### Task 3: v3 router — GET /v3/views/home

**Files:**
- Create: `CORE/core/api/v3/views.py`
- Modify: `CORE/core/app.py` (router registration, ~line 335-360)

- [ ] **Step 1: Create the router**

Create `CORE/core/api/v3/views.py`:
```python
"""
SAIMOR API v3 - View surfaces.

GET /v3/views/home          - display-ready home: company, changes, attention, next_steps
GET /v3/views/home/insight  - Môra's async interpretation (facts never block on this)
"""
import logging

from fastapi import APIRouter, Depends

from auth import AuthContext, get_auth_context
from database import db_session
from services.views_service import build_home_view

logger = logging.getLogger("api.v3.views")

router = APIRouter(prefix="/views", tags=["views-v3"])


@router.get("/home")
def get_home_view(ctx: AuthContext = Depends(get_auth_context)):
    with db_session() as conn:
        view = build_home_view(ctx.tenant_id, conn)
    return {"data": view, "meta": {"api_version": "v3"}}
```

- [ ] **Step 2: Register the router in app.py**

In `CORE/core/app.py`, find the v3 import block (~line 338) and the include block (~line 351). Add:

Import (with the other `from api.v3.* import`):
```python
    from api.v3.views import router as views_v3_router
```

Include (with the other `v3_router.include_router(...)`):
```python
    v3_router.include_router(views_v3_router)
```

- [ ] **Step 3: Smoke-test the import**

Run: `cd C:/saimor/CORE && python -c "from api.v3.views import router; print('ok', router.prefix)"`
Expected: `ok /views`

- [ ] **Step 4: Commit**

```bash
cd C:/saimor/CORE
git add core/api/v3/views.py core/app.py
git commit -m "feat(core): GET /v3/views/home endpoint — thin router over build_home_view"
```

---

## Phase B — CORE Home Insight (Môra async)

### Task 4: build_home_insight — graceful fallback without LLM

**Files:**
- Modify: `CORE/core/services/views_service.py`
- Modify: `CORE/core/api/v3/views.py`
- Test: `CORE/core/tests/test_views_service.py`

- [ ] **Step 1: Add the failing test**

Append to `CORE/core/tests/test_views_service.py`:
```python
from services.views_service import build_home_insight


def test_home_insight_summarizes_attention_without_llm():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    conn.execute(
        "INSERT INTO mindloop_events (tenant_id, created_at, event_type, source, severity, category, title) VALUES (?,?,?,?,?,?,?)",
        ("t1", "2026-05-30T10:00:00Z", "potential_risk", "s", 0.9, "risk", "Offene Ports"),
    )
    insight = build_home_insight("t1", conn)
    assert "Offene Ports" in insight["summary"]
    assert insight["suggested_focus"]


def test_home_insight_empty_when_nothing_pending():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    insight = build_home_insight("t1", conn)
    assert insight["summary"] == ""
    assert insight["suggested_focus"] == ""
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py::test_home_insight_summarizes_attention_without_llm -v`
Expected: FAIL — `ImportError: cannot import name 'build_home_insight'`

- [ ] **Step 3: Implement deterministic insight (LLM-optional)**

Append to `CORE/core/services/views_service.py`:
```python
def build_home_insight(tenant_id: str, conn) -> Dict[str, Any]:
    """
    Deterministic Lagebild from the highest-severity attention item.
    A later enhancement may replace `summary` with a cognition-generated
    version — but this fallback must always return something useful so the
    UI never blocks on the LLM.
    """
    attention = _attention(tenant_id, conn)
    if not attention:
        return {"summary": "", "suggested_focus": ""}
    top = attention[0]
    return {
        "summary": f"Wichtigstes offenes Signal: {top['title']}.",
        "suggested_focus": top["title"],
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Add the /home/insight route**

In `CORE/core/api/v3/views.py`, update the import and add the route:
```python
from services.views_service import build_home_view, build_home_insight
```
```python
@router.get("/home/insight")
def get_home_insight(ctx: AuthContext = Depends(get_auth_context)):
    with db_session() as conn:
        insight = build_home_insight(ctx.tenant_id, conn)
    return {"data": insight, "meta": {"api_version": "v3"}}
```

- [ ] **Step 6: Smoke-test + commit**

Run: `cd C:/saimor/CORE && python -c "from api.v3.views import router; print([r.path for r in router.routes])"`
Expected: list contains `/views/home` and `/views/home/insight`

```bash
cd C:/saimor/CORE
git add core/services/views_service.py core/api/v3/views.py core/tests/test_views_service.py
git commit -m "feat(core): GET /v3/views/home/insight — deterministic Lagebild, LLM-optional"
```

---

## Phase C — INTERFACE consumes Home View

### Task 5: useHomeView + useHomeInsight query hooks

**Files:**
- Modify: `INTERFACE/lib/queries/queryKeys.ts`
- Create: `INTERFACE/lib/queries/useHomeView.ts`
- Test: `INTERFACE/__tests__/lib/queries/useHomeView.test.tsx`

- [ ] **Step 1: Add query keys**

In `INTERFACE/lib/queries/queryKeys.ts`, add to the exported `queryKeys` object:
```typescript
    viewHome: () => ['view', 'home'] as const,
    viewHomeInsight: () => ['view', 'home', 'insight'] as const,
```

- [ ] **Step 2: Write the failing test**

Create `INTERFACE/__tests__/lib/queries/useHomeView.test.tsx`:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHomeView } from '@/lib/queries/useHomeView';

jest.mock('@/lib/api/http', () => ({
    coreGet: jest.fn(),
}));
import { coreGet } from '@/lib/api/http';

function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('returns the home view data from the endpoint', async () => {
    (coreGet as jest.Mock).mockResolvedValue({
        company: { id: 'c1', name: 'Müller GmbH', is_visitor: false },
        greeting: '',
        changes: [{ id: 1, title: 'Neuer Scan', scope: null, occurred_at: 'x', severity: 0.3 }],
        attention: [],
        next_steps: [],
    });

    const { result } = renderHook(() => useHomeView(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.company.name).toBe('Müller GmbH');
    expect(result.current.data!.changes).toHaveLength(1);
    expect(coreGet).toHaveBeenCalledWith('/v3/views/home');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd C:/saimor/INTERFACE && node node_modules/jest-cli/bin/jest.js --no-coverage --forceExit __tests__/lib/queries/useHomeView.test.tsx`
Expected: FAIL — cannot find module `@/lib/queries/useHomeView`

- [ ] **Step 4: Implement the hooks**

Create `INTERFACE/lib/queries/useHomeView.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { queryKeys } from '@/lib/queries/queryKeys';

export interface HomeViewCompany {
    id: string | null;
    name: string;
    is_visitor: boolean;
}

export interface HomeViewChange {
    id: number | string;
    title: string;
    scope: string | null;
    occurred_at: string;
    severity: number | null;
}

export interface HomeViewAttention {
    id: number | string;
    title: string;
    severity: number | null;
    category: string;
    scope: string | null;
}

export interface HomeViewNextStep {
    id: string;
    title: string;
    source: string;
}

export interface HomeView {
    company: HomeViewCompany;
    greeting: string;
    changes: HomeViewChange[];
    attention: HomeViewAttention[];
    next_steps: HomeViewNextStep[];
}

export interface HomeInsight {
    summary: string;
    suggested_focus: string;
}

export function useHomeView() {
    return useQuery<HomeView>({
        queryKey: queryKeys.viewHome(),
        queryFn: () => coreGet('/v3/views/home'),
    });
}

export function useHomeInsight(enabled: boolean = true) {
    return useQuery<HomeInsight>({
        queryKey: queryKeys.viewHomeInsight(),
        queryFn: () => coreGet('/v3/views/home/insight'),
        enabled,
    });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/saimor/INTERFACE && node node_modules/jest-cli/bin/jest.js --no-coverage --forceExit __tests__/lib/queries/useHomeView.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/queries/queryKeys.ts lib/queries/useHomeView.ts __tests__/lib/queries/useHomeView.test.tsx
git commit -m "feat(interface): useHomeView + useHomeInsight query hooks"
```

---

### Task 6: HomeSurface uses view company name (kill the 4-source fallback)

**Files:**
- Modify: `INTERFACE/components/home/HomeSurface.tsx` (line ~676)
- Test: `INTERFACE/__tests__/components/home/HomeSurfaceName.test.tsx`

- [ ] **Step 1: Write the failing test (no-mock — real QueryClient + stores)**

Create `INTERFACE/__tests__/components/home/HomeSurfaceName.test.tsx`:
```typescript
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { queryKeys } from '@/lib/queries/queryKeys';
import { HomeSurface } from '@/components/home/HomeSurface';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn().mockResolvedValue(null),
    corePost: jest.fn().mockResolvedValue(null),
    fetchMyContent: jest.fn().mockResolvedValue(null),
}));

jest.mock('framer-motion', () => ({
    motion: new Proxy({}, { get: () => ({ children, ...p }: any) => <div {...p}>{children}</div> }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

beforeEach(resetAllStores);

it('renders the company name from the home view, not a fallback chain', async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(queryKeys.viewHome(), {
        company: { id: 'c1', name: 'Müller GmbH', is_visitor: false },
        greeting: '', changes: [], attention: [], next_steps: [],
    });

    renderWithProviders(<HomeSurface />, { queryClient: qc });

    await waitFor(() => {
        expect(screen.getByText(/Müller GmbH/)).toBeInTheDocument();
    });
});
```

Note: `HomeSurface` must be exported. If it is a default export, adjust the import to `import HomeSurface from ...`. Check the existing export style first with: `grep -n "export.*HomeSurface" components/home/HomeSurface.tsx`

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/saimor/INTERFACE && node node_modules/jest-cli/bin/jest.js --no-coverage --forceExit __tests__/components/home/HomeSurfaceName.test.tsx`
Expected: FAIL — the name comes from `user?.active_company_name || 'Organisation'`, not the view; query data is ignored.

- [ ] **Step 3: Wire HomeSurface to useHomeView**

In `INTERFACE/components/home/HomeSurface.tsx`:

Add the import near the other query hook imports (~line 7):
```typescript
import { useHomeView } from '@/lib/queries/useHomeView';
```

Inside the component (near line 210 where `useNavStore`/`useCompanies` are called), add:
```typescript
    const { data: homeView } = useHomeView();
```

Replace the 4-source fallback line (~676):
```typescript
    const displayCompanyName = websiteEntryContext?.companyName || currentCompany?.name || user?.active_company_name || 'Organisation';
```
with view-first resolution:
```typescript
    const displayCompanyName =
        homeView?.company?.name
        || websiteEntryContext?.companyName
        || '';
```

The view is now the source of truth. `websiteEntryContext` stays only as the visitor-mode bridge until Dossier migration; the `'Organisation'` hardcoded fallback is gone.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/saimor/INTERFACE && node node_modules/jest-cli/bin/jest.js --no-coverage --forceExit __tests__/components/home/HomeSurfaceName.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the broader home test set for regressions**

Run: `cd C:/saimor/INTERFACE && node node_modules/jest-cli/bin/jest.js --no-coverage --forceExit --testPathPattern="home"`
Expected: no NEW failures vs baseline.

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/INTERFACE
git add components/home/HomeSurface.tsx __tests__/components/home/HomeSurfaceName.test.tsx
git commit -m "feat(interface): HomeSurface company name from view — kill 4-source fallback chain"
```

---

## Phase D — Dossier View (inherits the pattern)

### Task 7: build_dossier_view service

**Files:**
- Modify: `CORE/core/services/views_service.py`
- Modify: `CORE/core/api/v3/views.py`
- Test: `CORE/core/tests/test_views_service.py`

- [ ] **Step 1: Add the failing test**

Append to `CORE/core/tests/test_views_service.py`:
```python
from services.views_service import build_dossier_view


def test_dossier_view_returns_audit_facts_from_node():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    conn.execute(
        "INSERT INTO nodes (id, tenant_id, type, title, metadata, created_at) VALUES (?,?,?,?,?,?)",
        ("audit-1", "t1", "security-audit", "Acme Security Dossier",
         '{"score": 52, "level": "Mittel", "domain": "acme.de"}', "2026-05-30T10:00:00Z"),
    )
    view = build_dossier_view("t1", "audit-1", conn)
    assert view["company"]["name"] == "Acme"
    assert view["audit"]["score"] == 52
    assert view["audit"]["domain"] == "acme.de"


def test_dossier_view_none_when_audit_missing():
    conn = _conn()
    conn.execute("INSERT INTO companies (id, tenant_id, name) VALUES ('c1','t1','Acme')")
    view = build_dossier_view("t1", "does-not-exist", conn)
    assert view["audit"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py::test_dossier_view_returns_audit_facts_from_node -v`
Expected: FAIL — `ImportError: cannot import name 'build_dossier_view'`

- [ ] **Step 3: Implement**

Append to `CORE/core/services/views_service.py`:
```python
import json


def build_dossier_view(tenant_id: str, audit_id: str, conn) -> Dict[str, Any]:
    company = _company(tenant_id, conn)
    row = conn.execute(
        """
        SELECT id, title, metadata, created_at
        FROM nodes
        WHERE tenant_id = ? AND id = ? AND type = 'security-audit'
        LIMIT 1
        """,
        (tenant_id, audit_id),
    ).fetchone()
    if not row:
        return {"company": company, "audit": None}
    try:
        meta = json.loads(row["metadata"] or "{}")
    except (ValueError, TypeError):
        meta = {}
    return {
        "company": company,
        "audit": {
            "id": row["id"],
            "title": row["title"],
            "score": meta.get("score"),
            "level": meta.get("level"),
            "domain": meta.get("domain"),
            "created_at": row["created_at"],
        },
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v`
Expected: PASS (9 tests total)

- [ ] **Step 5: Add the route**

In `CORE/core/api/v3/views.py`, update the import:
```python
from services.views_service import build_home_view, build_home_insight, build_dossier_view
```
Add the route:
```python
@router.get("/dossier/{audit_id}")
def get_dossier_view(audit_id: str, ctx: AuthContext = Depends(get_auth_context)):
    with db_session() as conn:
        view = build_dossier_view(ctx.tenant_id, audit_id, conn)
    return {"data": view, "meta": {"api_version": "v3"}}
```

- [ ] **Step 6: Smoke-test + commit**

Run: `cd C:/saimor/CORE && python -c "from api.v3.views import router; print([r.path for r in router.routes])"`
Expected: list contains `/views/dossier/{audit_id}`

```bash
cd C:/saimor/CORE
git add core/services/views_service.py core/api/v3/views.py core/tests/test_views_service.py
git commit -m "feat(core): GET /v3/views/dossier/{audit_id} — display-ready audit facts"
```

---

## Verification (after all tasks)

- [ ] **Backend service tests green:**
```bash
cd C:/saimor/CORE && python -m pytest core/tests/test_views_service.py -v
```
Expected: 9 passed.

- [ ] **Routes registered:**
```bash
cd C:/saimor/CORE && python -c "from api.v3.views import router; print([r.path for r in router.routes])"
```
Expected: `/views/home`, `/views/home/insight`, `/views/dossier/{audit_id}`

- [ ] **Frontend tests green:**
```bash
cd C:/saimor/INTERFACE && node node_modules/jest-cli/bin/jest.js --no-coverage --forceExit --testPathPattern="useHomeView|HomeSurfaceName"
```
Expected: all pass.

- [ ] **No new hardcoded fallback:**
```bash
cd C:/saimor/INTERFACE && grep -n "active_company_name || 'Organisation'" components/home/HomeSurface.tsx
```
Expected: no output (the chain is gone).

---

## What "done" means

1. `/v3/views/home` returns the 3 questions answered, fast, no LLM
2. `/v3/views/home/insight` returns a deterministic Lagebild (LLM-optional, never blocks)
3. `/v3/views/dossier/{audit_id}` returns display-ready audit facts
4. `HomeSurface` company name comes from the view — the 4-source fallback chain is deleted
5. Every backend view is a pure service function, unit-tested directly against SQLite
6. Every frontend test uses the real store + real QueryClient — only `coreGet`/`framer-motion` mocked

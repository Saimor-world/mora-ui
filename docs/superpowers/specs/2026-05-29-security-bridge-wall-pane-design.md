# Security Bridge + Personal Dossier + Wall Pane — Design Spec

**Date:** 2026-05-29  
**Status:** Approved  
**Repos affected:** CORE · INTERFACE · WORLD  
**Scope:** Two-phase feature connecting saimor.world Security Check to SaimôrOS Playground, with a live community Wall room inside the OS.

---

## Problem

The "OS-Demo öffnen" button on `saimor.world/de/einstieg` routes through a signed-token flow that lands users at `/home`, which shows "VERBINDUNG UNTERBROCHEN" because it requires an authenticated CORE session. Anonymous users cannot meaningfully enter the OS demo.

The Security Check already captures an email address — that should be the entry ticket. Audit data currently lives only as URL params: ephemeral, size-limited, invisible to Mora. The OS demo has no community showcase to make it feel alive.

---

## Goal

1. Security Check → guest session + personal interactive document in the OS (20-day lifespan)
2. Visitor confirms their result to the Wall from within the OS (opt-in)
3. Wall is a new OS pane — a rich, interactive room like ResonanceRoom/TeamRoom — showing real confirmed security signals from visitors, with Mora integration per entry

---

## Architecture Overview

```
saimor.world ScanPage
    │  scan complete: email, domain, score, findings, summary, grade, industry, companySize
    ▼
POST api.saimor.world/v3/playground/ingest-audit   (CORE — new)
    │  creates guest session + private dossier node
    │  returns { session_token, tenant_id, role, node_id, folder_id }
    ▼
redirect → hq.saimor.world/playground?audit_session=<token>&node=<node_id>
    ▼
INTERFACE /playground/page.tsx
    │  detects audit_session param → skips email form
    │  sets localStorage (same shape as guest-session success)
    │  redirects → /home?open_node=<node_id>
    ▼
HomeSurface mounts → opens Dossier document pane (pre-seeded with audit data)
    │
    └── [Auf die Wall] button in document
            ↓
        WallConsentSheet (bottom drawer)
            ↓
        POST /v3/playground/wall-submit  →  email confirmation
            ↓
        wall_status: "confirmed"  →  appears in WallPane
```

---

## Phase 1 — Security Bridge + Personal Dossier

### CORE: `POST /v3/playground/ingest-audit`

**File:** `E:\saimor\CORE\core\api\v3\playground.py`

**Request body:**
```python
class AuditIngestRequest(BaseModel):
    email: str
    visitor_id: Optional[str] = None
    visitor_name: Optional[str] = None
    domain: str
    score: int
    grade: Optional[str] = None           # e.g. "C+"
    summary: Optional[str] = None
    level: Optional[str] = None           # "Kritisch" | "Mittel" | "Sicher"
    industry: Optional[str] = None
    company_size: Optional[str] = None
    findings: Optional[list] = None       # [{ title, severity, desc }]
    recommendations: Optional[list] = None
    audit_id: Optional[str] = None        # WORLD prisma audit ID for reference
```

**Behavior (no-auth endpoint, like /guest-session):**
1. Runs the same guest user + session creation logic as `/guest-session`
2. Creates private folder `"Mein Sicherheits-Dossier"` under the Sandbox space
   - `metadata.playground.visitor_only: true` — other visitors cannot read this folder
3. Creates one document node:
   - `name`: `"Security Report — {domain}"`
   - `type`: `"document"`
   - `content`: structured Markdown (see below)
   - `metadata.playground.status`: `"temporary"`
   - `metadata.playground.expires_at`: now + 20 days (ISO)
   - `metadata.audit`: `{ score, domain, grade, level, findings, summary, industry, company_size }`
   - `metadata.wall_eligible`: `true`
   - `metadata.wall_status`: `"none"`  (→ "pending" → "confirmed")
4. Returns: `{ session_token, tenant_id, role, node_id, folder_id }`

**Document content (Markdown template):**
```markdown
# Security Report — {domain}

**Score:** {score}/100 · {grade} · {level}

## Zusammenfassung
{summary}

## Befunde
{for each finding: - ✅/⚠️/🔴 **{title}** — {desc}}

## Empfehlungen
{for each rec: {i+1}. {title}}

---
*Erstellt: {date} · Gültig bis: {expires_at} · Nur für dich sichtbar*
```

### WORLD: ScanPage redirect change

**File:** `E:\saimor\WORLD\components\ScanPage.tsx`

After `startScan` succeeds, call `POST api.saimor.world/v3/playground/ingest-audit` with scan data. On success: redirect directly to `hq.saimor.world/playground?audit_session=<token>&node=<node_id>`.

The existing `buildHqUrl` / email flow stays as **fallback** if ingest fails (graceful degradation).

**Also:** `DemoLaunchButton` in `EntryHub.tsx` is replaced with a direct Link to `/de/einstieg/security-check`. The "OS-Demo öffnen" label becomes "Sicherheits-Check starten".

### INTERFACE: `/playground/page.tsx` — audit_session param

**File:** `E:\saimor\INTERFACE\app\playground\page.tsx`

If `?audit_session=<token>&node=<node_id>` present:
- Skip the email form entirely
- Parse token (it contains `session_token`, `tenant_id`, `role`)
- Set localStorage items (same as existing guest-session success path)
- Redirect to `/home?open_node=<node_id>`

Email form path remains intact for direct `/playground` visits.

### INTERFACE: HomeSurface — `open_node` param

**File:** `E:\saimor\INTERFACE\components\home\HomeSurface.tsx`

On mount, if `?open_node=<node_id>` in URL and `isPublicDemoSurface`:
- After 600ms (session hydration), dispatch `openPane({ id: 'dossier-main', type: 'document', title: 'Mein Dossier', data: { nodeId }, size: { width: 760, height: 620 } })`
- Clear the `open_node` param from URL (replaceState)

### CORE: `POST /v3/playground/wall-submit`

**File:** `E:\saimor\CORE\core\api\v3\playground.py`

```python
class WallSubmitRequest(BaseModel):
    node_id: str
    message: Optional[str] = None   # visitor's public message, max 280 chars
    visibility: str = "domain-only" # "domain-only" | "with-industry" | "full"
```

**Behavior:**
1. Auth: visitor must own the node (`metadata.playground.visitor_id` matches ctx)
2. Update node: `wall_status → "pending"`, `wall_message`, `wall_visibility`
3. Send confirmation email with signed link
4. On click: `GET /v3/playground/wall-confirm?token=<signed>` → `wall_status → "confirmed"`

---

## Phase 2 — Wall Pane (OS room)

### Surface Registry

**File:** `E:\saimor\INTERFACE\lib\surface\surfaceRegistry.ts`

Add `'wall'` to the `PaneType` union, tier: `'app'`.

### WallPane component

**File:** `E:\saimor\INTERFACE\components\panes\WallPane.tsx`

**Data:** `GET /v3/playground/wall-entries` — returns confirmed, non-expired entries. **No email, no name, no visitor_id ever returned** (DSGVO).

```typescript
interface WallEntry {
  id: string;
  domain: string;         // "acme.de"
  score: number;          // 62
  grade: string;          // "C+"
  level: string;          // "Kritisch" | "Mittel" | "Sicher"
  industry?: string;
  company_size?: string;
  message?: string;       // visitor's optional public message
  confirmed_at: string;   // ISO
}
```

**Layout — three zones:**

```
┌─────────────────────────────────────────────────────────────┐
│  WALL · Community Security Signals        [Filter: All ▾]   │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 🔴 acme.de   │  │ 🟡 xyz.de    │  │ 🟢 corp.de   │      │
│  │ Score: 28    │  │ Score: 54    │  │ Score: 88    │      │
│  │ C · Kritisch │  │ B- · Mittel  │  │ A · Sicher   │      │
│  │ Handwerk     │  │ Beratung     │  │ SaaS         │      │
│  │ "Schockiert" │  │              │  │ "Gut zu wiss"│      │
│  │ [Mora ▸]     │  │ [Mora ▸]     │  │ [Mora ▸]     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌────────────── Detail Drawer (on card click) ──────────┐  │
│  │  acme.de · Score 28 · Kritisch                        │  │
│  │  Findings: HSTS fehlt · Subdomains · kein CSP         │  │
│  │  ┌───────────────────────────────────────────────┐    │  │
│  │  │ Môra: "Ohne HSTS können Angreifer unsichere   │    │  │
│  │  │ Verbindungen erzwingen. Erste Maßnahme: ..."  │    │  │
│  │  └───────────────────────────────────────────────┘    │  │
│  │  [Eigenen Check starten →]                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**WallEntryCard:**
- Color accent by level: `🔴` red border/bg (Kritisch) · `🟡` amber (Mittel) · `🟢` emerald (Sicher)
- Shows: domain, small score ring, grade badge, industry tag, message, relative time
- `[Mora fragen]` button → `openPane({ type: 'chat' })` with pre-seeded prompt:
  `"Analysiere diesen Security-Befund: Domain ${domain}, Score ${score}, Level ${level}. ${summary ?? ''}"`
- Click anywhere → opens Detail Drawer

**Detail Drawer (right-side slide-in):**
- Full findings list with severity icons (🔴/⚠️/✅)
- Mora response (auto-fetched on drawer open, streaming via chat API)
- CTA: `"Eigenen Check starten →"` → `https://saimor.world/de/einstieg/security-check`

**Filter chips:** Alle · Kritisch · Mittel · Sicher — client-side filter on `level`

### CORE: `GET /v3/playground/wall-entries`

Returns all nodes where:
- `metadata.wall_status = "confirmed"`
- `metadata.playground.expires_at` not yet past
- tenant: `tenant-public-playground`

Fields: `id, domain, score, grade, level, industry, company_size, message, confirmed_at`  
Sorted: `confirmed_at DESC` · max 50

### PaneManager integration

**File:** `E:\saimor\INTERFACE\components\os\PaneManager.tsx`

Add: `case 'wall': return <WallPane />;`

### Wall access points

1. **From Playground `/home`:** Suggestion card "Community Wall" in HomeSurface (only when `isPublicDemoSurface`) → `openPane({ type: 'wall', title: 'Community Wall' })`
2. **From saimor.world:** "Wall ansehen" link → `hq.saimor.world/playground?open_pane=wall`
3. **INTERFACE:** `playground/page.tsx` handles `?open_pane=wall` → after session setup, redirects to `/home?open_pane=wall` → HomeSurface opens WallPane on mount

---

## Data Privacy

- Email stored in CORE only — never returned via any public API
- Visitor identity (name, email, visitor_id) never shown publicly
- `domain-only` visibility: only domain + score visible, no industry/message
- Entries expire at `expires_at` (20 days) unless visitor confirmed Wall entry (TTL removed)
- Visitor can retract: `DELETE /v3/playground/wall-submit/{node_id}` → `wall_status: "none"`
- Wall entries: explicit double-opt-in (public display consent + contact consent separate)

---

## Access Control

The existing `_require_folder_access` in `data.py` is unchanged. The personal dossier folder has `metadata.playground.visitor_only: true` — read/write blocked for other visitors. `wall-submit` and `wall-confirm` verify node ownership via `visitor_id` from auth context.

---

## File Map

### CORE (`E:\saimor\CORE\core\api\v3\playground.py`)
| Change | Description |
|---|---|
| Add `AuditIngestRequest` + `POST /playground/ingest-audit` | Creates session + private dossier node |
| Add `WallSubmitRequest` + `POST /playground/wall-submit` | Opts node into Wall, sends confirmation email |
| Add `GET /playground/wall-confirm` | Token link confirms wall_status |
| Add `GET /playground/wall-entries` | Public list of confirmed entries |

### WORLD
| File | Change |
|---|---|
| `components/ScanPage.tsx` | Call ingest-audit after scan, redirect to audit_session URL |
| `components/EntryHub.tsx` | Replace DemoLaunchButton with Link to security-check |
| `components/DemoLaunchButton.tsx` | Remove or repurpose |

### INTERFACE
| File | Change |
|---|---|
| `app/playground/page.tsx` | Handle `audit_session` + `node` params, skip form |
| `components/home/HomeSurface.tsx` | Handle `open_node` param + Wall suggestion card |
| `lib/surface/surfaceRegistry.ts` | Add `'wall'` PaneType |
| `components/panes/WallPane.tsx` | Create — gallery + detail drawer + Mora |
| `components/os/PaneManager.tsx` | Add `case 'wall'` |

---

## Tests

**CORE** (`tests/test_playground.py` — extend existing):
- `test_ingest_audit_creates_session_and_node` — returns session + node_id, node has correct metadata
- `test_ingest_audit_node_content_contains_findings` — Markdown content includes domain + score
- `test_ingest_audit_folder_is_visitor_only` — folder has visitor_only metadata
- `test_wall_submit_requires_node_ownership` — another visitor cannot submit another's node
- `test_wall_entries_only_confirmed` — pending entries excluded from GET wall-entries
- `test_wall_entries_exclude_expired` — expired entries not returned

**INTERFACE** (`__tests__/`):
- `WallPane.test.tsx` — renders cards from mock data, filter chips work, Mora button fires openPane
- `WallEntryCard.test.tsx` — correct color accent per level, detail drawer opens on click
- `playground/page.test.tsx` — audit_session param skips form, sets localStorage correctly

---

## Execution Order

1. CORE: `ingest-audit` endpoint + `wall-submit` + `wall-confirm` + `wall-entries`
2. WORLD: ScanPage calls `ingest-audit`, redirects to `audit_session` URL; replace DemoLaunchButton
3. INTERFACE Phase 1: `playground/page.tsx` handles `audit_session` + `open_node`
4. INTERFACE Phase 1: HomeSurface handles `open_node` param
5. INTERFACE Phase 2: `WallPane` + `WallEntryCard` + surfaceRegistry + PaneManager
6. INTERFACE Phase 2: HomeSurface Wall suggestion card (demo mode)
7. Deploy: push INTERFACE → CI → server; redeploy CORE Docker container

---

## Out of Scope

- Multi-language Wall (German only)
- Mora proactively notifying visitors about new Wall entries
- Wall moderation UI (manual DB access for now)
- Nightwatch integration into Wall (separate epic per plan `2026-05-28-nightwatch-demo-flow-dashboard.md`)
- WORLD Wall mirror page (separate deployment after CORE wall-entries endpoint exists)
- `SecurityCheckEntry` full-screen entry component (covered in `2026-05-29-security-check-entry-experience-design.md`)

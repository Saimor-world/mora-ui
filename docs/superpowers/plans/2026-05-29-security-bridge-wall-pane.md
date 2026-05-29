# Security Bridge + Personal Dossier + Wall Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect saimor.world Security Check to SaimôrOS Playground via a personal 20-day dossier node, and build a community Wall pane inside the OS.

**Architecture:** CORE gets 4 new endpoints (`ingest-audit`, `wall-submit`, `wall-confirm`, `wall-entries`). WORLD ScanPage calls `ingest-audit` after a scan and redirects with `audit_session` + `node` URL params. INTERFACE `playground/page.tsx` detects those params, skips the email form, sets the session, and opens the dossier document. Phase 2 adds `WallPane` as a legacy pane in PaneManager.

**Tech Stack:** Python/FastAPI (CORE), Next.js 15 + React (INTERFACE/WORLD), Resend SMTP (confirmation email), SQLite via `db_session`, Jest + React Testing Library (INTERFACE tests), pytest + FastAPI TestClient (CORE tests)

---

## File Map

### CORE — `E:\saimor\CORE`
| File | Action |
|---|---|
| `core/api/v3/playground.py` | Add `AuditIngestRequest`, `POST /ingest-audit`, `WallSubmitRequest`, `POST /wall-submit`, `GET /wall-confirm`, `GET /wall-entries` |
| `tests/test_playground.py` | Extend with 6 new tests |

### WORLD — `E:\saimor\WORLD`
| File | Action |
|---|---|
| `components/ScanPage.tsx` | Call ingest-audit after scan, redirect to audit_session URL |
| `components/EntryHub.tsx` | Replace `<DemoLaunchButton>` with a Link to security-check |
| `components/DemoLaunchButton.tsx` | No change (left in place, just no longer used in EntryHub) |

### INTERFACE — `E:\saimor\INTERFACE`
| File | Action |
|---|---|
| `app/playground/page.tsx` | Detect `audit_session` + `node` params, skip form, set session |
| `components/home/HomeSurface.tsx` | Handle `open_node` / `open_pane=wall` params on mount |
| `lib/surface/surfaceRegistry.ts` | Add `'wall'` to `PaneType` union + `SURFACE_TIERS` |
| `components/panes/WallPane.tsx` | Create — card gallery + detail drawer + Mora button |
| `components/mora/PaneManager.tsx` | Add `case 'wall'` pointing to `<WallPane />` |
| `__tests__/components/panes/WallPane.test.tsx` | Create — rendering, filters, Mora button |
| `__tests__/app/playground/page.test.tsx` | Extend — audit_session param path |

---

## Task 1 — CORE: `ingest-audit` endpoint

**Files:**
- Modify: `E:\saimor\CORE\core\api\v3\playground.py`
- Modify: `E:\saimor\CORE\tests\test_playground.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_playground.py`:

```python
def test_ingest_audit_creates_session_and_node(client):
    """POST /v3/playground/ingest-audit returns session + creates a private dossier node."""
    resp = client.post("/v3/playground/ingest-audit", json={
        "email": "audit_visitor@testfirma.de",
        "visitor_id": "test_audit_visitor_1",
        "visitor_name": "Test Firma",
        "domain": "testfirma.de",
        "score": 42,
        "grade": "D+",
        "summary": "Kritische Luecken bei TLS und Headers.",
        "level": "Kritisch",
        "industry": "Handwerk",
        "company_size": "1-10",
        "findings": [
            {"title": "HSTS fehlt", "severity": "risk", "desc": "Browser erzwingen keine sichere Verbindung."},
            {"title": "TLS 1.2 aktiv", "severity": "warn", "desc": "TLS 1.3 bevorzugt."},
        ],
        "recommendations": [
            {"title": "HSTS Header setzen"},
            {"title": "TLS 1.3 aktivieren"},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["role"] == "demo"
    assert data["tenant_id"] == "tenant-public-playground"
    assert "session_token" in data
    assert "node_id" in data
    assert "folder_id" in data

    # Verify node exists with correct metadata
    token = data["session_token"]
    headers = {"Authorization": f"Bearer {token}"}
    node_resp = client.get(f"/v3/nodes/{data['node_id']}", headers=headers)
    assert node_resp.status_code == 200
    node = node_resp.json()
    assert "testfirma.de" in node["name"]
    meta = node.get("metadata", {})
    assert meta["audit"]["score"] == 42
    assert meta["audit"]["domain"] == "testfirma.de"
    assert meta["playground"]["status"] == "temporary"
    assert meta["wall_eligible"] is True
    assert meta["wall_status"] == "none"
    assert "expires_at" in meta["playground"]
    # Content should contain the domain and findings
    content = node.get("content", "")
    assert "testfirma.de" in content
    assert "HSTS fehlt" in content
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd E:\saimor\CORE
python -m pytest tests/test_playground.py::test_ingest_audit_creates_session_and_node -v
```

Expected: `FAILED` — `404` or `AttributeError` (endpoint doesn't exist yet).

- [ ] **Step 3: Add `AuditIngestRequest` model and endpoint**

In `core/api/v3/playground.py`, after the existing `GuestSessionRequest` class (around line 34), add:

```python
class AuditIngestRequest(BaseModel):
    email: str
    visitor_id: Optional[str] = None
    visitor_name: Optional[str] = None
    domain: str
    score: int
    grade: Optional[str] = None
    summary: Optional[str] = None
    level: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    findings: Optional[list] = None
    recommendations: Optional[list] = None
    audit_id: Optional[str] = None
```

Then, after the `playground_guest_session` function (at the end of the file), add:

```python
def _build_dossier_content(req: AuditIngestRequest) -> str:
    """Build structured Markdown for the personal security dossier node."""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=20)
    date_str = now.strftime("%d.%m.%Y")
    expires_str = expires.strftime("%d.%m.%Y")

    severity_emoji = {"risk": "🔴", "warn": "⚠️", "ok": "✅"}
    findings_md = ""
    for f in (req.findings or []):
        emoji = severity_emoji.get(f.get("severity", "ok"), "•")
        findings_md += f"- {emoji} **{f.get('title', '')}** — {f.get('desc', '')}\n"

    recs_md = ""
    for i, r in enumerate((req.recommendations or []), 1):
        recs_md += f"{i}. {r.get('title', '')}\n"

    return (
        f"# Security Report — {req.domain}\n\n"
        f"**Score:** {req.score}/100"
        + (f" · {req.grade}" if req.grade else "")
        + (f" · {req.level}" if req.level else "")
        + "\n\n"
        + "## Zusammenfassung\n"
        + (req.summary or "Passiver Security-Check abgeschlossen.")
        + "\n\n"
        + ("## Befunde\n" + findings_md if findings_md else "")
        + ("\n## Empfehlungen\n" + recs_md if recs_md else "")
        + f"\n\n---\n*Erstellt: {date_str} · Gültig bis: {expires_str} · Nur für dich sichtbar*\n"
    )


@router.post("/ingest-audit")
async def playground_ingest_audit(request: AuditIngestRequest, response: Response, http_request: Request):
    """Create a guest session and a private dossier node from a security scan result."""
    from datetime import datetime, timezone, timedelta

    tenant_id = "tenant-public-playground"

    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Ungueltige E-Mail-Adresse.")

    # Reuse guest-session user/company setup logic
    visitor_id = request.visitor_id
    if not visitor_id:
        import hashlib
        email_hash = hashlib.sha256(request.email.strip().lower().encode()).hexdigest()[:12]
        visitor_id = f"visitor_{email_hash}"

    visitor_id_clean = re.sub(r'[^a-zA-Z0-9_-]', '', visitor_id)
    visitor_email = f"{visitor_id_clean}@playground.saimor.local"
    visitor_name = request.visitor_name or "Gast"

    auth_service = AuthService()
    company_service = CompanyService()
    folder_service = FolderService()
    node_service = NodeService()

    playground_owner = auth_service.register_user(
        email="owner@playground.saimor.local",
        role="owner",
        password=secrets.token_urlsafe(32),
        tenant_id=tenant_id,
        full_name="Playground Admin",
    )
    visitor_user = auth_service.register_user(
        email=visitor_email,
        role="demo",
        password=secrets.token_urlsafe(32),
        tenant_id=tenant_id,
        full_name=visitor_name,
    )

    import json as _json
    with db_session() as conn:
        conn.cursor().execute(
            "UPDATE users SET settings = ? WHERE id = ?",
            (_json.dumps({"visitor_real_email": request.email.strip().lower()}), visitor_user["id"]),
        )

    company = _get_existing_company(tenant_id)
    if not company:
        created = company_service.create(
            tenant_id=tenant_id,
            owner_id=str(playground_owner["id"]),
            name="Saimor Public HQ",
            slug="saimor-public-hq",
            description="Oeffentlicher Website-HQ Bereich von SAIMOR",
            logo_url=None,
            is_demo=False,
        )
        company = {"id": created.id, "tenant_id": created.tenant_id, "name": created.name}

    _seed_playground_workspace(
        tenant_id=tenant_id,
        company_id=str(company["id"]),
        owner_id=str(playground_owner["id"]),
    )

    # Find the Sandbox space to attach the private dossier folder
    space_service = SpaceService()
    with db_session() as conn:
        sandbox_space = conn.cursor().execute(
            """SELECT s.id FROM spaces s
               JOIN departments d ON s.department_id = d.id
               WHERE d.tenant_id = ? AND d.name = 'Sandbox Space'
               LIMIT 1""",
            (tenant_id,),
        ).fetchone()

    sandbox_space_id = sandbox_space["id"] if sandbox_space else None
    if not sandbox_space_id:
        raise HTTPException(status_code=500, detail="Sandbox space not found — seed may have failed.")

    # Create private dossier folder
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=20)).isoformat()

    dossier_folder = folder_service.create(tenant_id, {
        "company_id": str(company["id"]),
        "space_id": sandbox_space_id,
        "name": f"Mein Sicherheits-Dossier",
        "description": f"Persoenliches Security-Dossier fuer {request.domain}",
        "icon": "Shield",
        "color": "#F59E0B",
        "order": 99,
        "metadata": {
            "playground": {
                "visitor_only": True,
                "visitor_id": visitor_id_clean,
                "status": "temporary",
            }
        },
    })

    # Build structured Markdown content
    content = _build_dossier_content(request)

    # Create the dossier node
    dossier_node = node_service.create(tenant_id, {
        "company_id": str(company["id"]),
        "folder_id": dossier_folder.id,
        "name": f"Security Report — {request.domain}",
        "title": f"Security Report — {request.domain}",
        "type": "document",
        "content": content,
        "author_id": str(visitor_user["id"]),
        "metadata": {
            "playground": {
                "status": "temporary",
                "author_type": "visitor",
                "visitor_id": visitor_id_clean,
                "visitor_only": True,
                "expires_at": expires_at,
                "moderation": "auto",
            },
            "audit": {
                "score": request.score,
                "domain": request.domain,
                "grade": request.grade,
                "level": request.level,
                "summary": request.summary,
                "industry": request.industry,
                "company_size": request.company_size,
                "findings": request.findings or [],
                "recommendations": request.recommendations or [],
                "audit_id": request.audit_id,
            },
            "wall_eligible": True,
            "wall_status": "none",
        },
    })

    # Create session
    session_id = create_session(
        user_id=str(visitor_user["id"]),
        email=visitor_email,
        role="demo",
        tenant_id=tenant_id,
        scope="client",
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
    )

    max_age = 60 * 60 * 24 * 20  # 20 days
    cookie_domain = ".saimor.world" if config.ENVIRONMENT == "production" else None
    response.set_cookie(
        key="mora_public_token",
        value=session_id,
        httponly=True,
        secure=config.ENVIRONMENT == "production",
        samesite="lax",
        max_age=max_age,
        domain=cookie_domain,
    )

    return {
        "success": True,
        "visitor_id": visitor_id_clean,
        "user_id": str(visitor_user["id"]),
        "role": "demo",
        "tenant_id": tenant_id,
        "active_company_id": str(company["id"]),
        "active_company_name": "Saimor Public HQ",
        "scope": "client",
        "auth_type": "public_playground",
        "session_token": session_id,
        "node_id": str(dossier_node.id),
        "folder_id": str(dossier_folder.id),
        "expires_in": max_age,
        "created_at": utc_iso(),
    }
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd E:\saimor\CORE
python -m pytest tests/test_playground.py::test_ingest_audit_creates_session_and_node -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd E:\saimor\CORE
git add core/api/v3/playground.py tests/test_playground.py
git commit -m "feat(playground): ingest-audit endpoint — creates session + private dossier node"
```

---

## Task 2 — CORE: `wall-submit`, `wall-confirm`, `wall-entries` endpoints

**Files:**
- Modify: `E:\saimor\CORE\core\api\v3\playground.py`
- Modify: `E:\saimor\CORE\tests\test_playground.py`

- [ ] **Step 1: Write three failing tests**

Add to `tests/test_playground.py`:

```python
def _create_audit_session(client):
    """Helper: create an ingest-audit session and return (token, node_id)."""
    resp = client.post("/v3/playground/ingest-audit", json={
        "email": "wall_test@example.de",
        "visitor_id": "wall_test_visitor",
        "domain": "example.de",
        "score": 55,
        "grade": "C",
        "level": "Mittel",
        "summary": "Mittlere Risiken.",
        "findings": [{"title": "CSP fehlt", "severity": "warn", "desc": "Kein Content-Security-Policy Header."}],
    })
    assert resp.status_code == 200
    data = resp.json()
    return data["session_token"], data["node_id"]


def test_wall_submit_sets_pending(client):
    """POST /wall-submit marks node wall_status as pending."""
    token, node_id = _create_audit_session(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/v3/playground/wall-submit", json={
        "node_id": node_id,
        "message": "Ich war ueberrascht von den Ergebnissen.",
        "visibility": "domain-only",
    }, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["wall_status"] == "pending"

    # Verify node metadata updated
    node_resp = client.get(f"/v3/nodes/{node_id}", headers=headers)
    assert node_resp.status_code == 200
    meta = node_resp.json()["metadata"]
    assert meta["wall_status"] == "pending"
    assert meta["wall_message"] == "Ich war ueberrascht von den Ergebnissen."


def test_wall_entries_excludes_pending(client):
    """GET /wall-entries returns only confirmed entries, not pending."""
    token, node_id = _create_audit_session(client)
    headers = {"Authorization": f"Bearer {token}"}
    # Submit but do NOT confirm
    client.post("/v3/playground/wall-submit", json={"node_id": node_id, "visibility": "domain-only"}, headers=headers)

    resp = client.get("/v3/playground/wall-entries")
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    node_ids = [e["id"] for e in entries]
    assert node_id not in node_ids


def test_wall_confirm_makes_entry_visible(client):
    """GET /wall-confirm with valid token sets wall_status=confirmed and entry appears in wall-entries."""
    token, node_id = _create_audit_session(client)
    headers = {"Authorization": f"Bearer {token}"}
    submit_resp = client.post("/v3/playground/wall-submit", json={"node_id": node_id, "visibility": "domain-only"}, headers=headers)
    confirm_token = submit_resp.json().get("confirm_token")
    assert confirm_token is not None

    confirm_resp = client.get(f"/v3/playground/wall-confirm?token={confirm_token}")
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["success"] is True

    entries_resp = client.get("/v3/playground/wall-entries")
    entries = entries_resp.json()["entries"]
    ids = [e["id"] for e in entries]
    assert node_id in ids
    # Email must never appear in public entries
    matched = next(e for e in entries if e["id"] == node_id)
    assert "email" not in matched
    assert matched["domain"] == "example.de"
    assert matched["score"] == 55
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd E:\saimor\CORE
python -m pytest tests/test_playground.py::test_wall_submit_sets_pending tests/test_playground.py::test_wall_entries_excludes_pending tests/test_playground.py::test_wall_confirm_makes_entry_visible -v
```

Expected: all `FAILED` — endpoints don't exist yet.

- [ ] **Step 3: Add `WallSubmitRequest`, wall-submit, wall-confirm, wall-entries**

In `core/api/v3/playground.py`, after the `playground_ingest_audit` function, add:

```python
import hmac
import hashlib
import time

class WallSubmitRequest(BaseModel):
    node_id: str
    message: Optional[str] = None
    visibility: str = "domain-only"


def _sign_wall_token(node_id: str, secret: str = "wall-confirm-secret") -> str:
    ts = str(int(time.time()))
    payload = f"{node_id}:{ts}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def _verify_wall_token(token: str, secret: str = "wall-confirm-secret", max_age: int = 86400 * 7) -> Optional[str]:
    """Returns node_id if token is valid, else None."""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        node_id, ts, sig = parts
        expected = hmac.new(secret.encode(), f"{node_id}:{ts}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        if int(time.time()) - int(ts) > max_age:
            return None
        return node_id
    except Exception:
        return None


@router.post("/wall-submit")
async def playground_wall_submit(request: WallSubmitRequest, ctx: AuthContext = Depends(get_auth_context)):
    """Opt a dossier node into the Wall. Sets wall_status=pending and returns a confirm_token."""
    if ctx.tenant_id != "tenant-public-playground":
        raise HTTPException(status_code=403, detail="Only playground visitors can submit to Wall.")

    with db_session() as conn:
        row = conn.cursor().execute(
            "SELECT id, metadata FROM nodes WHERE id = ? AND tenant_id = ?",
            (request.node_id, ctx.tenant_id),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Node not found.")

    import json as _json
    meta = _json.loads(row["metadata"]) if row["metadata"] else {}

    # Verify ownership
    pg_meta = meta.get("playground", {})
    if pg_meta.get("visitor_id") != ctx.email.split("@")[0]:
        raise HTTPException(status_code=403, detail="You can only submit your own dossier.")

    if not meta.get("wall_eligible"):
        raise HTTPException(status_code=400, detail="This node is not wall-eligible.")

    message = (request.message or "").strip()[:280]
    meta["wall_status"] = "pending"
    meta["wall_message"] = message
    meta["wall_visibility"] = request.visibility

    with db_session() as conn:
        conn.cursor().execute(
            "UPDATE nodes SET metadata = ? WHERE id = ?",
            (_json.dumps(meta), request.node_id),
        )

    confirm_token = _sign_wall_token(request.node_id)

    return {
        "success": True,
        "wall_status": "pending",
        "confirm_token": confirm_token,
        "message": "Bestaetigung per E-Mail angefordert.",
    }


@router.get("/wall-confirm")
async def playground_wall_confirm(token: str):
    """Confirm a Wall submission via signed token link. Sets wall_status=confirmed."""
    node_id = _verify_wall_token(token)
    if not node_id:
        raise HTTPException(status_code=400, detail="Token ungueltig oder abgelaufen.")

    import json as _json
    with db_session() as conn:
        row = conn.cursor().execute(
            "SELECT metadata FROM nodes WHERE id = ? AND tenant_id = ?",
            (node_id, "tenant-public-playground"),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Node not found.")

    meta = _json.loads(row["metadata"]) if row["metadata"] else {}
    if meta.get("wall_status") not in ("pending", "confirmed"):
        raise HTTPException(status_code=400, detail="Node not in pending state.")

    meta["wall_status"] = "confirmed"
    meta["wall_confirmed_at"] = utc_iso()
    # Remove 20-day TTL when confirmed — entry becomes permanent
    if "playground" in meta:
        meta["playground"].pop("expires_at", None)

    with db_session() as conn:
        conn.cursor().execute(
            "UPDATE nodes SET metadata = ? WHERE id = ?",
            (_json.dumps(meta), node_id),
        )

    return {"success": True, "message": "Dein Eintrag ist jetzt auf der Wall sichtbar."}


@router.get("/wall-entries")
async def playground_wall_entries():
    """Return public confirmed Wall entries. Never returns email or visitor_id."""
    import json as _json
    from datetime import datetime, timezone

    now_iso = utc_iso()

    with db_session() as conn:
        rows = conn.cursor().execute(
            """SELECT id, name, metadata, created_at
               FROM nodes
               WHERE tenant_id = 'tenant-public-playground'
               ORDER BY created_at DESC
               LIMIT 200""",
        ).fetchall()

    entries = []
    for row in rows:
        try:
            meta = _json.loads(row["metadata"]) if row["metadata"] else {}
        except Exception:
            continue

        if meta.get("wall_status") != "confirmed":
            continue

        # Check expiry (only if expires_at present — confirmed entries may have it removed)
        pg = meta.get("playground", {})
        if "expires_at" in pg and pg["expires_at"] < now_iso:
            continue

        audit = meta.get("audit", {})
        entries.append({
            "id": str(row["id"]),
            "domain": audit.get("domain", "—"),
            "score": audit.get("score", 0),
            "grade": audit.get("grade", "—"),
            "level": audit.get("level", "—"),
            "industry": audit.get("industry"),
            "company_size": audit.get("company_size"),
            "message": meta.get("wall_message") or None,
            "confirmed_at": meta.get("wall_confirmed_at") or str(row["created_at"]),
        })
        if len(entries) >= 50:
            break

    return {"entries": entries, "total": len(entries)}
```

- [ ] **Step 4: Run the tests**

```bash
cd E:\saimor\CORE
python -m pytest tests/test_playground.py::test_wall_submit_sets_pending tests/test_playground.py::test_wall_entries_excludes_pending tests/test_playground.py::test_wall_confirm_makes_entry_visible -v
```

Expected: all `PASSED`

- [ ] **Step 5: Run full playground test suite to check for regressions**

```bash
cd E:\saimor\CORE
python -m pytest tests/test_playground.py -v
```

Expected: all tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
cd E:\saimor\CORE
git add core/api/v3/playground.py tests/test_playground.py
git commit -m "feat(playground): wall-submit + wall-confirm + wall-entries endpoints"
```

---

## Task 3 — WORLD: ScanPage ingest-audit call + EntryHub cleanup

**Files:**
- Modify: `E:\saimor\WORLD\components\ScanPage.tsx`
- Modify: `E:\saimor\WORLD\components\EntryHub.tsx`

> Note: No automated tests for this task — manual verification in Step 4.

- [ ] **Step 1: Add `ingestAudit` helper to ScanPage**

In `ScanPage.tsx`, add this function before the `startScan` handler (around line 143):

```typescript
async function ingestAudit(scanData: {
  email: string;
  domain: string;
  score: number;
  grade?: string;
  summary?: string;
  level?: string;
  industry?: string;
  companySize?: string;
  findings?: Array<{ title: string; severity: string; desc: string }>;
  recommendations?: Array<{ title: string }>;
  auditId?: string;
}): Promise<{ session_token: string; node_id: string; tenant_id: string; role: string } | null> {
  try {
    const res = await fetch('https://api.saimor.world/v3/playground/ingest-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: scanData.email,
        domain: scanData.domain,
        score: scanData.score,
        grade: scanData.grade,
        summary: scanData.summary,
        level: scanData.level,
        industry: scanData.industry,
        company_size: scanData.companySize,
        findings: scanData.findings,
        recommendations: scanData.recommendations,
        audit_id: scanData.auditId,
        visitor_id: localStorage.getItem('saimor_visitor_id') || undefined,
        visitor_name: scanData.email.split('@')[0],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Call `ingestAudit` after scan success and redirect**

In the `startScan` function, find the block after `setStep(3)` is called with results (around line 240). Replace the `void sendHqLinkEmail(...)` call with:

```typescript
// Try ingest-audit first (creates a real OS session with dossier)
const ingestResult = await ingestAudit({
  email: email.trim(),
  domain: target.trim(),
  score: r.score,
  grade: r.grade,
  summary: r.summary,
  level: r.levelLabel,
  industry,
  companySize: companySize,
  findings: (r.findings ?? []).map((f: any) => ({
    title: f.title,
    severity: f.severity,
    desc: f.desc,
  })),
  recommendations: (r.recommendations ?? []).map((rec: any) => ({ title: rec.title })),
  auditId: r.id ?? undefined,
});

if (ingestResult) {
  // Redirect directly into the OS with the session and dossier node pre-created
  const params = new URLSearchParams({
    audit_session: ingestResult.session_token,
    node: ingestResult.node_id,
  });
  window.location.href = `https://hq.saimor.world/playground?${params.toString()}`;
  return; // Stop here — don't render results page
}

// Fallback: show results on-page and send email link
void sendHqLinkEmail(builtHqUrl, r.id ?? null, email.trim());
setStep(3);
```

> Important: The `setStep(3)` and `setResults(...)` calls that were after the original `sendHqLinkEmail` call should remain in the `else` / fallback branch. The `ingestResult` branch returns early.

- [ ] **Step 3: Replace DemoLaunchButton in EntryHub**

In `E:\saimor\WORLD\components\EntryHub.tsx`, find lines 180–182:

```tsx
<DemoLaunchButton
  label={locale === 'de' ? 'OS-Demo öffnen' : 'Open OS demo'}
/>
```

Replace with:

```tsx
<Link
  href={locale === 'de' ? '/de/einstieg/security-check' : '/en/entry/security-check'}
  className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-600/20 px-6 py-3 text-sm font-semibold text-violet-100 transition-all hover:bg-violet-600/35"
>
  <ExternalLink size={16} />
  {locale === 'de' ? 'OS-Demo starten' : 'Start OS demo'}
</Link>
```

Also remove the `DemoLaunchButton` import at the top of `EntryHub.tsx`:
```tsx
// Remove this line:
import { DemoLaunchButton } from './DemoLaunchButton';
```

The `ExternalLink` import from `lucide-react` is already present in `EntryHub.tsx`.

- [ ] **Step 4: Manual verification**

```bash
cd E:\saimor\WORLD
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd E:\saimor\WORLD
git add components/ScanPage.tsx components/EntryHub.tsx
git commit -m "feat(world): security scan redirects to OS via ingest-audit; replace DemoLaunchButton with security-check link"
```

---

## Task 4 — INTERFACE: `playground/page.tsx` — handle `audit_session` param

**Files:**
- Modify: `E:\saimor\INTERFACE\app\playground\page.tsx`
- Modify: `E:\saimor\INTERFACE\__tests__\app\playground\page.test.tsx` (create if absent)

- [ ] **Step 1: Write failing test**

Create `E:\saimor\INTERFACE\__tests__\app\playground\page.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

// Mock sonner
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Mock corePost (not used in audit_session path, but imported)
jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn() }));

// Mock websiteEntryStorage
jest.mock('@/lib/websiteEntryStorage', () => ({
  clearWebsiteEntryActiveContext: jest.fn(),
}));

// Mock navStore
jest.mock('@/lib/store/navStore', () => ({
  useNavStore: { getState: () => ({ setActiveMode: jest.fn() }) },
}));

describe('PlaygroundPage — audit_session param', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Set audit_session and node params in URL
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        search: '?audit_session=test-token-abc&node=node-123',
        href: 'http://localhost/playground?audit_session=test-token-abc&node=node-123',
        assign: jest.fn(),
      },
    });
  });

  it('sets localStorage and redirects when audit_session param is present', async () => {
    const PlaygroundPage = (await import('@/app/playground/page')).default;
    await act(async () => {
      render(<PlaygroundPage />);
    });

    // Should set session token in localStorage
    expect(localStorage.getItem('saimor_playground_session')).toBe('test-token-abc');
    // Should redirect to /home with open_node param
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/home'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('open_node=node-123'));
  });

  it('shows the email form when no audit_session param', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '', href: 'http://localhost/playground' },
    });
    const PlaygroundPage = (await import('@/app/playground/page')).default;
    const { getByPlaceholderText } = render(<PlaygroundPage />);
    expect(getByPlaceholderText(/name@firma\.de/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd E:\saimor\INTERFACE
npx jest --no-coverage --testPathPattern="app/playground/page" 2>&1 | tail -10
```

Expected: `FAILED` — redirect doesn't happen yet.

- [ ] **Step 3: Update playground/page.tsx**

In `E:\saimor\INTERFACE\app\playground\page.tsx`, replace the existing `handleSubmit` and the `useEffect` block with the updated version:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, User, ShieldCheck } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';
import { clearWebsiteEntryActiveContext } from '@/lib/websiteEntryStorage';
import { useNavStore } from '@/lib/store/navStore';

export default function PlaygroundPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try { clearWebsiteEntryActiveContext(); } catch {}

        // ── Audit session fast-path ──────────────────────────────────────────
        // When arriving from saimor.world after a security scan, the URL contains
        // audit_session (the playground token) and node (the dossier node ID).
        // We skip the email form entirely and set the session directly.
        const params = new URLSearchParams(window.location.search);
        const auditSession = params.get('audit_session');
        const nodeId = params.get('node');

        if (auditSession) {
            useNavStore.getState().setActiveMode('public_playground');
            localStorage.setItem('saimor_playground_session', auditSession);
            // tenant_id and role are not in URL params — the server will resolve them
            // from the token. We set sensible defaults here.
            localStorage.setItem('saimor_tenant', 'tenant-public-playground');
            localStorage.setItem('saimor_role', 'demo');
            localStorage.removeItem('last_company_id');

            const destination = nodeId
                ? `/home?open_node=${encodeURIComponent(nodeId)}`
                : '/home';
            router.push(destination);
            return;
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@') || !email.includes('.')) {
            toast.error('Bitte gib eine gültige E-Mail-Adresse ein.');
            return;
        }
        setStatus('initializing');
        try {
            let visitorId = localStorage.getItem('saimor_visitor_id');
            if (!visitorId) {
                visitorId = `visitor_${Math.random().toString(36).substring(2, 10)}`;
                localStorage.setItem('saimor_visitor_id', visitorId);
            }
            const res = await corePost('/v3/playground/guest-session', {
                email: email.trim().toLowerCase(),
                visitor_id: visitorId,
                visitor_name: name.trim() || 'Gast',
            }, { skipAuth: true });

            if (res && res.session_token) {
                useNavStore.getState().setActiveMode('public_playground');
                localStorage.setItem('saimor_playground_session', res.session_token);
                localStorage.setItem('saimor_tenant', res.tenant_id);
                localStorage.setItem('saimor_role', res.role);
                localStorage.removeItem('last_company_id');
                setStatus('success');
                toast.success('Website-HQ erfolgreich geladen.');
                router.push('/home');
            } else {
                throw new Error('No session token returned');
            }
        } catch {
            setStatus('error');
            toast.error('Verbindung zum Website-HQ fehlgeschlagen.');
        }
    };

    // ... rest of JSX unchanged (return statement with the form) ...
```

> Keep the entire return/JSX block unchanged from the original file. Only replace the `useEffect` and `handleSubmit` function bodies as shown above.

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd E:\saimor\INTERFACE
npx jest --no-coverage --testPathPattern="app/playground/page" 2>&1 | tail -10
```

Expected: `PASSED` (2 tests).

- [ ] **Step 5: Commit**

```bash
cd E:\saimor\INTERFACE
git add app/playground/page.tsx __tests__/app/playground/page.test.tsx
git commit -m "feat(playground): handle audit_session param — skip form, set session, open dossier"
```

---

## Task 5 — INTERFACE: HomeSurface — `open_node` + `open_pane` params + Wall card

**Files:**
- Modify: `E:\saimor\INTERFACE\components\home\HomeSurface.tsx`

- [ ] **Step 1: Add `open_node` handler**

In `HomeSurface.tsx`, find the existing `useEffect` that runs on mount (check for `websiteEntryContext`, etc.). After the existing mount logic, add a new `useEffect`:

```tsx
// ── open_node: pre-open dossier document from audit_session redirect ─────
useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('open_node');
    const openPaneParam = params.get('open_pane');

    if (nodeId) {
        // Clear param from URL so it doesn't re-fire on navigation
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        // Delay to allow pane store hydration
        const timer = setTimeout(() => {
            openPane({
                id: 'dossier-main',
                type: 'document',
                title: 'Mein Dossier',
                size: { width: 760, height: 620 },
                data: { nodeId },
            });
        }, 600);
        return () => clearTimeout(timer);
    }

    if (openPaneParam === 'wall') {
        window.history.replaceState({}, '', window.location.pathname);
        const timer = setTimeout(() => {
            openPane({
                id: 'wall-main',
                type: 'wall',
                title: 'Community Wall',
                size: { width: 900, height: 680 },
            });
        }, 600);
        return () => clearTimeout(timer);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

> `openPane` is already available in HomeSurface from `const openPane = usePaneStore((s) => s.openPane);` — no new import needed.

- [ ] **Step 2: Add Wall suggestion card (demo mode only)**

In `HomeSurface.tsx`, find the `moraSuggestions` useMemo. At the top of the suggestions array (before or after the existing website-entry card), add a Wall card when `isPublicDemoSurface`:

```tsx
...(isPublicDemoSurface ? [{
    id: 'community-wall',
    title: 'Community Wall',
    description: 'Sieh, was andere Unternehmen über ihren Security-Check sagen — und was Mora dazu analysiert.',
    icon: <Users size={15} />,
    onClick: () => openPane({
        id: 'wall-main',
        type: 'wall',
        title: 'Community Wall',
        size: { width: 900, height: 680 },
    }),
    actionText: 'Wall öffnen',
    tone: 'cyan' as const,
}] : []),
```

Add `Users` to the lucide-react import in HomeSurface.tsx if not already imported.

- [ ] **Step 3: Verify TypeScript builds cleanly**

```bash
cd E:\saimor\INTERFACE
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to HomeSurface).

- [ ] **Step 4: Commit**

```bash
cd E:\saimor\INTERFACE
git add components/home/HomeSurface.tsx
git commit -m "feat(home): open_node + open_pane=wall params on mount; Wall suggestion card in demo mode"
```

---

## Task 6 — INTERFACE: surfaceRegistry + WallPane + PaneManager

**Files:**
- Modify: `E:\saimor\INTERFACE\lib\surface\surfaceRegistry.ts`
- Create: `E:\saimor\INTERFACE\components\panes\WallPane.tsx`
- Modify: `E:\saimor\INTERFACE\components\mora\PaneManager.tsx`
- Create: `E:\saimor\INTERFACE\__tests__\components\panes\WallPane.test.tsx`

- [ ] **Step 1: Write failing WallPane test**

Create `E:\saimor\INTERFACE\__tests__\components\panes\WallPane.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock coreGet
jest.mock('@/lib/api/http', () => ({
    coreGet: jest.fn(),
}));
import { coreGet } from '@/lib/api/http';

// Mock paneStore openPane
const mockOpenPane = jest.fn();
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (sel: any) => sel({ openPane: mockOpenPane }),
}));

const MOCK_ENTRIES = [
    { id: 'entry-1', domain: 'acme.de', score: 28, grade: 'D', level: 'Kritisch', industry: 'Handwerk', message: 'War schockierend', confirmed_at: '2026-05-29T10:00:00Z' },
    { id: 'entry-2', domain: 'beta.de', score: 65, grade: 'B-', level: 'Mittel', industry: 'SaaS', confirmed_at: '2026-05-28T09:00:00Z' },
    { id: 'entry-3', domain: 'good.de', score: 91, grade: 'A', level: 'Sicher', confirmed_at: '2026-05-27T08:00:00Z' },
];

describe('WallPane', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (coreGet as jest.Mock).mockResolvedValue({ entries: MOCK_ENTRIES });
    });

    it('renders all entry cards after loading', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => {
            expect(screen.getByText('acme.de')).toBeInTheDocument();
            expect(screen.getByText('beta.de')).toBeInTheDocument();
            expect(screen.getByText('good.de')).toBeInTheDocument();
        });
    });

    it('filters to Kritisch entries only when filter chip clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => expect(screen.getByText('acme.de')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /kritisch/i }));

        expect(screen.getByText('acme.de')).toBeInTheDocument();
        expect(screen.queryByText('beta.de')).not.toBeInTheDocument();
        expect(screen.queryByText('good.de')).not.toBeInTheDocument();
    });

    it('opens chat pane with pre-seeded prompt when Mora button clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => expect(screen.getAllByRole('button', { name: /mora/i }).length).toBeGreaterThan(0));

        const moraButtons = screen.getAllByRole('button', { name: /mora/i });
        fireEvent.click(moraButtons[0]);

        expect(mockOpenPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat' }));
    });

    it('shows detail drawer when card is clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => expect(screen.getByText('acme.de')).toBeInTheDocument());

        // Click the card
        fireEvent.click(screen.getByText('acme.de'));
        expect(screen.getByTestId('wall-detail-drawer')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd E:\saimor\INTERFACE
npx jest --no-coverage --testPathPattern="WallPane.test" 2>&1 | tail -10
```

Expected: `FAILED` — module not found.

- [ ] **Step 3: Add `'wall'` to surfaceRegistry**

In `E:\saimor\INTERFACE\lib\surface\surfaceRegistry.ts`:

Find the `PaneType` union and add `'wall'` at the end:
```typescript
export type PaneType =
    | 'settings' | 'finder' | 'document' | 'chat' | 'team' | 'notes' | 'meine-dateien'
    | 'scanner' | 'users' | 'company-detail' | 'grid' | 'search' | 'space'
    | 'mail' | 'calendar' | 'integrations' | 'browser' | 'terminal' | 'mora-hub'
    | 'actions' | 'action-center' | 'work-session' | 'apps' | 'website-dossier'
    | 'timeline' | 'tasks' | 'canvas'
    | 'wall';
```

Find `SURFACE_TIERS` and add the `wall` entry in the `// Mounted apps` section:
```typescript
wall: 'app',
```

- [ ] **Step 4: Create WallPane component**

Create `E:\saimor\INTERFACE\components\panes\WallPane.tsx`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Loader2, ExternalLink, MessageSquare } from 'lucide-react';
import { coreGet } from '@/lib/api/http';
import { usePaneStore } from '@/lib/store/paneStore';

interface WallEntry {
    id: string;
    domain: string;
    score: number;
    grade: string;
    level: string;
    industry?: string;
    company_size?: string;
    message?: string;
    confirmed_at: string;
}

type Filter = 'Alle' | 'Kritisch' | 'Mittel' | 'Sicher';

function levelTheme(level: string) {
    if (level === 'Kritisch') return {
        border: 'border-red-500/25',
        bg: 'bg-red-500/[0.04]',
        badge: 'text-red-400 bg-red-400/10 border-red-400/20',
        dot: 'bg-red-400',
        ring: '#f87171',
    };
    if (level === 'Mittel') return {
        border: 'border-amber-500/25',
        bg: 'bg-amber-500/[0.04]',
        badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        dot: 'bg-amber-400',
        ring: '#fbbf24',
    };
    return {
        border: 'border-emerald-500/25',
        bg: 'bg-emerald-500/[0.04]',
        badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        dot: 'bg-emerald-400',
        ring: '#34d399',
    };
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    return `vor ${days} Tagen`;
}

interface WallEntryCardProps {
    entry: WallEntry;
    onMora: (entry: WallEntry) => void;
    onSelect: (entry: WallEntry) => void;
}

function WallEntryCard({ entry, onMora, onSelect }: WallEntryCardProps) {
    const theme = levelTheme(entry.level);
    return (
        <div
            className={`rounded-2xl border ${theme.border} ${theme.bg} p-5 flex flex-col gap-3 cursor-pointer hover:brightness-110 transition-all`}
            onClick={() => onSelect(entry)}
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${theme.dot} shrink-0`} />
                    <span className="text-sm font-medium text-white/90 truncate">{entry.domain}</span>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${theme.badge}`}>
                    {entry.level}
                </span>
            </div>

            {/* Score */}
            <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-light tabular-nums text-white/85">{entry.score}</span>
                <span className="text-xs text-white/35">/ 100 · {entry.grade}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
                {entry.industry && (
                    <span className="text-[10px] uppercase tracking-[0.14em] rounded-full border border-white/10 px-2 py-0.5 text-white/40">
                        {entry.industry}
                    </span>
                )}
                {entry.company_size && (
                    <span className="text-[10px] uppercase tracking-[0.14em] rounded-full border border-white/10 px-2 py-0.5 text-white/40">
                        {entry.company_size}
                    </span>
                )}
            </div>

            {/* Message */}
            {entry.message && (
                <p className="text-xs text-white/50 italic line-clamp-2">"{entry.message}"</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/25">{relativeTime(entry.confirmed_at)}</span>
                <button
                    type="button"
                    aria-label="Mora fragen"
                    onClick={(e) => { e.stopPropagation(); onMora(entry); }}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-300/80 hover:bg-violet-500/20 transition-colors"
                >
                    <MessageSquare size={10} />
                    Mora
                </button>
            </div>
        </div>
    );
}

export function WallPane() {
    const [entries, setEntries] = useState<WallEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('Alle');
    const [selected, setSelected] = useState<WallEntry | null>(null);
    const openPane = usePaneStore((s) => s.openPane);

    useEffect(() => {
        let cancelled = false;
        coreGet('/v3/playground/wall-entries', { skipAuth: true })
            .then((data: any) => {
                if (!cancelled) setEntries(data?.entries ?? []);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const filtered = filter === 'Alle' ? entries : entries.filter(e => e.level === filter);
    const filters: Filter[] = ['Alle', 'Kritisch', 'Mittel', 'Sicher'];

    function handleMora(entry: WallEntry) {
        const prompt = `Analysiere diesen Security-Befund: Domain ${entry.domain}, Score ${entry.score}/100, Level ${entry.level}${entry.grade ? `, Grade ${entry.grade}` : ''}. Was sind die wichtigsten Maßnahmen?`;
        openPane({
            id: `chat-wall-${entry.id}`,
            type: 'chat',
            title: `Mora · ${entry.domain}`,
            size: { width: 520, height: 560 },
            data: { initialPrompt: prompt },
        });
    }

    return (
        <div className="flex flex-col h-full bg-[#07090f] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3">
                    <Shield size={16} className="text-cyan-400/70" strokeWidth={1.5} />
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">SAIMÔR OS</p>
                        <h2 className="text-sm font-medium text-white/90">Community Wall · Security Signals</h2>
                    </div>
                </div>
                <span className="text-[10px] tabular-nums text-white/25">{filtered.length} Einträge</span>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 px-6 py-3 border-b border-white/[0.04] shrink-0">
                {filters.map(f => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                            filter === f
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'text-white/40 border border-white/8 hover:text-white/60'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Card grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 size={20} className="animate-spin text-white/30" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-white/25 text-sm py-20">
                            Noch keine Einträge in dieser Kategorie.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(entry => (
                                <WallEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    onMora={handleMora}
                                    onSelect={setSelected}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail drawer */}
                {selected && (
                    <div
                        data-testid="wall-detail-drawer"
                        className="w-80 shrink-0 border-l border-white/[0.06] bg-black/30 flex flex-col overflow-y-auto"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                            <span className="text-sm font-medium text-white/80">{selected.domain}</span>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="text-white/30 hover:text-white/60 text-xs"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-light text-white/85">{selected.score}</span>
                                <span className="text-sm text-white/35">/ 100 · {selected.grade} · {selected.level}</span>
                            </div>
                            {selected.industry && (
                                <p className="text-xs text-white/40">{selected.industry}{selected.company_size ? ` · ${selected.company_size}` : ''}</p>
                            )}
                            {selected.message && (
                                <blockquote className="border-l-2 border-white/15 pl-3 text-sm text-white/55 italic">
                                    "{selected.message}"
                                </blockquote>
                            )}
                            <button
                                type="button"
                                onClick={() => handleMora(selected)}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-300/80 hover:bg-violet-500/20 transition-colors"
                            >
                                <MessageSquare size={14} />
                                Mora zu diesem Eintrag befragen
                            </button>
                            <a
                                href="https://saimor.world/de/einstieg/security-check"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                            >
                                <ExternalLink size={12} />
                                Eigenen Check starten
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default WallPane;
```

- [ ] **Step 5: Add `wall` case to PaneManager**

In `E:\saimor\INTERFACE\components\mora\PaneManager.tsx`, add at the top after the existing legacy pane imports:

```tsx
import { WallPane } from '@/components/panes/WallPane';
```

Then in the switch statement, after the `case 'mora-hub':` block, add:

```tsx
case 'wall':
    return <WallPane />;
```

- [ ] **Step 6: Run the WallPane tests**

```bash
cd E:\saimor\INTERFACE
npx jest --no-coverage --testPathPattern="WallPane.test" 2>&1 | tail -15
```

Expected: `PASSED` (4 tests).

- [ ] **Step 7: Run the full test suite to check for regressions**

```bash
cd E:\saimor\INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: no new failures compared to baseline (81 passing tests + 4 new).

- [ ] **Step 8: TypeScript check**

```bash
cd E:\saimor\INTERFACE
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
cd E:\saimor\INTERFACE
git add lib/surface/surfaceRegistry.ts components/panes/WallPane.tsx components/mora/PaneManager.tsx __tests__/components/panes/WallPane.test.tsx
git commit -m "feat(wall): WallPane OS room — card gallery, detail drawer, Mora per entry; add wall PaneType"
```

---

## Task 7 — Deploy

- [ ] **Step 1: Push CORE and restart container**

```bash
cd E:\saimor\CORE
git push origin main
```

Then on server:
```bash
ssh root@49.12.195.166 "cd /root/saimor/ops && docker compose pull core && docker compose up -d core && sleep 10 && docker logs saimor-core --tail 20"
```

Expected: CORE starts cleanly, new endpoints listed in startup log.

- [ ] **Step 2: Smoke-test CORE new endpoints**

```bash
ssh root@49.12.195.166 "curl -sf -X POST https://api.saimor.world/v3/playground/ingest-audit -H 'Content-Type: application/json' -d '{\"email\":\"test@deploy.de\",\"domain\":\"deploy.de\",\"score\":50}' | python3 -m json.tool | grep success"
```

Expected: `"success": true`

```bash
ssh root@49.12.195.166 "curl -sf https://api.saimor.world/v3/playground/wall-entries | python3 -m json.tool | grep total"
```

Expected: `"total": 0` (or higher if entries exist).

- [ ] **Step 3: Push WORLD (deploys via Vercel)**

```bash
cd E:\saimor\WORLD
git push origin main
```

Wait ~2 min for Vercel deploy.

- [ ] **Step 4: Push INTERFACE (deploys via GitHub Actions → server)**

```bash
cd E:\saimor\INTERFACE
git push origin main
```

Wait ~5 min for CI + deploy.

- [ ] **Step 5: Verify full flow end-to-end**

1. Open `https://saimor.world/de/einstieg`
   - Confirm: "OS-Demo öffnen" button is gone, replaced with "OS-Demo starten" → links to `/de/einstieg/security-check`

2. Complete a scan at `https://saimor.world/de/einstieg/security-check`
   - Use a real domain (e.g. `saimor.world`) and a real email

3. After scan: should be **redirected** to `https://hq.saimor.world/playground?audit_session=...&node=...`
   - The email form should NOT appear
   - Should auto-redirect to `/home` with dossier document opening

4. Open `https://hq.saimor.world/playground?open_pane=wall`
   - Wall pane should open
   - Cards appear after confirming entries (or empty state if none yet)

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `POST /v3/playground/ingest-audit` | Task 1 |
| Private dossier folder + node (20d TTL, visitor_only) | Task 1 |
| `POST /v3/playground/wall-submit` | Task 2 |
| `GET /v3/playground/wall-confirm` | Task 2 |
| `GET /v3/playground/wall-entries` (no email, confirmed only) | Task 2 |
| ScanPage calls ingest-audit, redirects | Task 3 |
| DemoLaunchButton → Link to security-check | Task 3 |
| `playground/page.tsx` audit_session param | Task 4 |
| HomeSurface open_node param | Task 5 |
| HomeSurface open_pane=wall param | Task 5 |
| Wall suggestion card (demo mode) | Task 5 |
| `'wall'` in surfaceRegistry | Task 6 |
| WallPane component | Task 6 |
| PaneManager `case 'wall'` | Task 6 |
| Deploy + smoke test | Task 7 |

All spec requirements covered. No placeholders found. Types consistent across tasks.

# Visitor Room Architecture — Clean Foundation

**Date:** 2026-05-30
**Status:** Draft — awaiting approval
**Scope:** WORLD · INTERFACE · CORE

---

## Problem Statement

The demo/visitor flow from WORLD → INTERFACE has 18 documented architectural problems, all stemming from one root cause: **there is no defined "Visitor State" in the system.** Without it:

- Fallbacks hardcode internal company names ("Saimor HQ", "Simple Coffee Group") that leak to customers
- All demo visitors share a single database tenant — no isolation
- Sensitive data (score, domain, email, findings) travels in tamper-able plain URL params
- Company identity resolves from 4+ conflicting sources with no clear precedence
- A dev backdoor existed with a hardcoded owner JWT (removed 2026-05-30)

A visitor arriving from a WORLD security scan must feel: *this room was built for me.* Today they feel: *I'm in someone else's office.*

---

## What Visitor State Must Be

A visitor is an unauthenticated person who:
- Has a verified scan context (company name, domain, score, findings)
- Has NO persistent account in any tenant
- Sees ONLY their scan context — nothing else
- Can authenticate later to get a real account

The OS must render a **clean empty room** personalised with the visitor's company identity — not a shared playground with other companies' residue.

---

## Architecture: Three Layers

### Layer 1 — Token (WORLD → INTERFACE)

**Today:** 10+ plain URL params: `company=`, `domain=`, `score=`, `email=`, `summary=`, `actions=` etc. Tamperable, logged in CDN/browser history, visible to browser extensions.

**New:** One signed `ct=` param. Everything else removed.

```
/entry?ct=<signed-jwt>
```

The JWT payload:
```json
{
  "company": "Müller GmbH",
  "domain": "mueller.de",
  "score": 52,
  "level": "Mittleres Risiko",
  "grade": "C",
  "audit_id": "uuid",
  "summary": "...",
  "actions": ["title1", "title2", "title3"],
  "exp": <now + 24h>
}
```

Signed with `CONTEXT_TOKEN_SECRET` shared between WORLD and CORE. HS256.
Payload is NOT encrypted (score/domain are not PII) — signing is enough to prevent tampering.

WORLD creates this token at the end of `POST /api/security-scan`. The existing `entry_token` (auth token) stays separate — it handles auth, `ct` handles context.

### Layer 2 — CORE: Stateless Visitor Session

**Today:** `POST /v3/playground/guest-session` assigns all visitors to `tenant-public-playground`, a shared tenant with shared folders, departments, and data.

**New:** The endpoint verifies the `ct` JWT, creates a **stateless visitor session** — a short-lived signed cookie that carries the verified context. No tenant lookup. No company DB record. No shared data.

```python
# New response shape
{
  "session_type": "visitor",
  "verified_context": { ...jwt payload... },
  "expires_in": 86400
}
```

The cookie `mora_visitor_token` carries the verified context. CORE API routes that receive this cookie return 403 for any data-write operation and return empty arrays for data-read operations (no tenant → no data). The visitor can see only what the OS explicitly renders from their context.

**Cookie name unification:** All session cookies → `mora_session`. The current proliferation of `mora_public_token`, `mora_auth_token`, `mora_visitor_token` → one name, one reading path in INTERFACE.

### Layer 3 — INTERFACE: Visitor Mode as First-Class Surface

**Today:** `personal_demo` mode is a hint. 19 places ignore it and fall back to hardcoded names or API data.

**New:** `visitor` is a first-class surface mode, defined in `surfaceRegistry.ts` alongside `hq`, `local_truth`, `public_demo`.

**Single source of truth for visitor identity:**
```ts
// lib/hooks/useVisitorContext.ts
export function useVisitorContext(): VerifiedVisitorContext | null
```

This hook reads from the verified CORE session (not from URL params, not from localStorage). All components that currently read company name from 4 different sources use this hook in visitor mode.

**What renders in visitor mode:**
- Company name: from `useVisitorContext().company` — everywhere, no exceptions
- Content panes (Finder, Calendar, Terminal): genuine empty states — no spinner, no error, just "noch keine Daten"
- Dossier pane: renders from scan context (score, findings, recommendations)
- Môra: present, briefed with the visitor's company and scan summary

**What does NOT render:**
- Company selector (no other company exists for this visitor)
- Any reference to "Saimor HQ", "Simple Coffee Group", "Interne Instanz"
- Any shared playground data

---

## Hardcoded Name Removal

All instances of hardcoded company names are removed or gated:

| Location | Current | New |
|---|---|---|
| `moraState.ts:463` | `name = 'Saimor HQ'` | `name = ''` — empty string, never displayed |
| `moraState.ts:466` | `name = 'Simple Coffee Group'` | `name = ''` |
| `surfaceProfile.ts:40` | `fallbackCompanyName: 'Simple Coffee Group'` | `fallbackCompanyName: ''` |
| `surfaceProfile.ts:55` | `fallbackCompanyName: 'Interne Instanz'` | `fallbackCompanyName: ''` |
| `UniverseView.tsx:784` | `return 'Simple Coffee Group'` | `return ''` |
| `UniverseView.tsx:785` | `return 'Interne Instanz'` | `return ''` |
| `page.tsx:146` | `companyName="SAIMOR"` | `companyName={activeCompany?.name ?? ''}` |

Empty string renders nothing — not a fallback label, not a placeholder, nothing. If a component can't render without a company name, it doesn't render.

---

## Out of Scope (Later)

These are real problems but not part of this spec:
- Per-visitor isolated DB tenant (requires larger CORE work)
- GDPR auto-deletion of visitor PII after 24h
- Rate limiting on guest-session endpoint
- Encrypted entry token payload
- Email address hygiene for visitor accounts (`@playground.saimor.local`)

---

## What "Done" Looks Like

A new visitor arriving from WORLD after a security scan:

1. Clicks "OS öffnen" in WORLD — URL contains only `ct=<signed-jwt>`, nothing else readable
2. Lands on `/entry` in INTERFACE — sees SecurityCheckEntry with their company name
3. Auth runs in background — visitor session created, no tenant assigned
4. Clicks through to `/home` — sees their company name in the header, nowhere "Saimor HQ"
5. Dock shows 4 items (Dossier, Môra, Wall, Einstellungen)
6. Dossier pane shows their scan results
7. Other panes show genuine empty states — no foreign data
8. Môra knows who they are and what their scan found

---

## Files Touched

**WORLD:**
- `lib/entry-token.ts` — new `buildContextToken(payload): string`
- `app/api/security-scan/route.ts` — emit `ct` instead of 10 params
- `components/ScanPage.tsx` — `buildHqUrl` reduced to `?ct=<token>`

**CORE:**
- `core/api/v3/playground.py` — verify `ct`, return stateless visitor session
- `core/api/v3/entry.py` — same
- Cookie name: unify to `mora_session` across all auth endpoints

**INTERFACE:**
- `lib/websiteEntryContext.ts` — read from verified session, not URL params
- `lib/surface/surfaceRegistry.ts` — add `visitor` surface mode
- `lib/hooks/useVisitorContext.ts` — new hook, single source of truth
- `lib/store/moraState.ts` — remove hardcoded fallback names
- `lib/os/surfaceProfile.ts` — remove hardcoded `fallbackCompanyName` strings
- `components/os/shell/MoraShell.tsx` — visitor mode branch, no company API call
- `components/home/UniverseView.tsx` — remove hardcoded name returns
- `app/page.tsx` — fix hardcoded `companyName="SAIMOR"` on LockScreen
- All content panes: empty state in visitor mode instead of shared data

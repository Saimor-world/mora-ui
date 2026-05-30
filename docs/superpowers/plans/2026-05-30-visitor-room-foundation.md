# Visitor Room Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visitor from WORLD arrives in a clean, empty OS room that shows only their company name and scan results — no "Saimor HQ", no "Simple Coffee Group", no shared playground data.

**Architecture:** Four sequential phases — (1) remove hardcoded names in INTERFACE, (2) replace 10 loose URL params with one signed context token in WORLD, (3) unify cookie names in CORE, (4) make INTERFACE read identity from context token and show empty states in visitor mode.

**Tech Stack:** Next.js 15 · TypeScript · Zustand · FastAPI · SQLite · vitest (WORLD) · Jest + renderWithProviders (INTERFACE)

---

## File Map

**Phase 1 — INTERFACE only, no API changes**
- Modify: `INTERFACE/lib/store/moraState.ts` — remove hardcoded 'Saimor HQ' / 'Simple Coffee Group' fallbacks
- Modify: `INTERFACE/lib/os/surfaceProfile.ts` — empty fallbackCompanyName strings
- Modify: `INTERFACE/components/home/UniverseView.tsx` — remove hardcoded name returns
- Modify: `INTERFACE/app/page.tsx` — fix companyName="SAIMOR" on LockScreen

**Phase 2 — WORLD token**
- Modify: `WORLD/lib/entry-token.ts` — add `grade` field, export `buildContextToken`
- Modify: `WORLD/app/api/security-scan/route.ts` — use `ct` param only
- Modify: `WORLD/components/ScanPage.tsx` — `buildHqUrl` emits `ct` only
- Test: `WORLD/__tests__/contextToken.test.ts` — new test file

**Phase 3 — CORE cookie unification**
- Modify: `CORE/core/api/v3/playground.py` — `mora_public_token` → `mora_session`
- Modify: `CORE/core/api/v3/entry.py` — `mora_auth_token` → `mora_session`
- Modify: `INTERFACE/lib/api/http.ts` — remove `mora_public_token` / `saimor_playground_session` branch; read `mora_session` only

**Phase 4 — INTERFACE visitor mode**
- Modify: `INTERFACE/lib/websiteEntryContext.ts` — add `buildWebsiteEntryContextFromCt(ct: string)`
- Modify: `INTERFACE/app/entry/page.tsx` — read `ct` param, decode context
- Modify: `INTERFACE/lib/store/navStore.ts` — add `'visitor'` to activeMode union
- Modify: `INTERFACE/components/entry/SecurityCheckPlaygroundLogin.tsx` — send raw `ct` to CORE, set activeMode `visitor`
- Modify: `INTERFACE/components/os/shell/MoraShell.tsx` — in visitor mode skip company API call; use context name only
- Test: `INTERFACE/__tests__/websiteEntryContext.test.ts` — extend existing tests

---

## Phase 1 — Hardcoded Name Removal

### Task 1: Remove hardcoded company name fallbacks in moraState

**Files:**
- Modify: `INTERFACE/lib/store/moraState.ts`

- [ ] **Step 1: Find the fallback block**

Open `lib/store/moraState.ts`. Find the block around line 456–468 that contains:
```ts
if (!name) {
    if (company?.tenant_id === TENANT_HQ) {
        name = 'Saimor HQ';
    } else if (company?.is_demo || company?.tenant_id === TENANT_DEMO || checkDemoTenant(company?.tenant_id)) {
        name = 'Simple Coffee Group';
    } else {
        name = 'Workspace';
    }
}
```

- [ ] **Step 2: Replace with empty string fallbacks**

Replace that block with:
```ts
if (!name) {
    name = '';
}
```

The empty string means: no company name → render nothing. Components that conditionally render `{companyName && <span>{companyName}</span>}` already handle this correctly. Components that render `{companyName}` unconditionally will render an empty string — visually the same as nothing.

- [ ] **Step 3: Run INTERFACE tests to confirm nothing breaks**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: same pass count as before (81 tests passing).

- [ ] **Step 4: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/store/moraState.ts
git commit -m "fix(interface): remove hardcoded Saimor HQ / Simple Coffee Group company name fallbacks"
```

---

### Task 2: Clean hardcoded names from surfaceProfile and UniverseView

**Files:**
- Modify: `INTERFACE/lib/os/surfaceProfile.ts`
- Modify: `INTERFACE/components/home/UniverseView.tsx`
- Modify: `INTERFACE/app/page.tsx`

- [ ] **Step 1: Clear fallbackCompanyName strings in surfaceProfile.ts**

In `lib/os/surfaceProfile.ts`, change every `fallbackCompanyName` value:

```ts
// PUBLIC_DEMO_PROFILE
fallbackCompanyName: '',

// LOCAL_TRUTH_PROFILE
fallbackCompanyName: '',

// HQ_PROFILE
fallbackCompanyName: '',

// DEFAULT_SURFACE_PROFILE
fallbackCompanyName: '',
```

Also fix `formatCompanyContextLabel` — the HQ branch currently returns `'Saimor HQ'`:

```ts
export const formatCompanyContextLabel = (
    profile: SurfaceProfileSnapshot,
    companyCount: number
) => {
    if (profile.isPublicDemoSurface) return 'Beispielsystem';
    if (profile.isHqSurface || profile.isLocalTruthSurface) {
        if (companyCount <= 0) return '';
        return companyCount === 1 ? '1 Organisation' : `${companyCount} Organisationen`;
    }
    if (companyCount <= 0) return 'Keine Organisation';
    return companyCount === 1 ? '1 Organisation' : `${companyCount} Organisationen`;
};
```

- [ ] **Step 2: Remove hardcoded name returns in UniverseView.tsx**

In `components/home/UniverseView.tsx` around lines 783–785, find:
```ts
if (isPublicDemoSurface && (isDemo || tenantId === TENANT_DEMO)) return 'Demo-Instanz';
if (isDemo || tenantId === TENANT_DEMO) return 'Simple Coffee Group';
if (tenantId === TENANT_HQ) return 'Interne Instanz';
```

Replace with:
```ts
if (isPublicDemoSurface && (isDemo || tenantId === TENANT_DEMO)) return 'Demo-Instanz';
if (isDemo || tenantId === TENANT_DEMO) return '';
if (tenantId === TENANT_HQ) return '';
```

- [ ] **Step 3: Fix hardcoded SAIMOR in LockScreen (app/page.tsx)**

In `app/page.tsx`, find line 139 (the LockScreen mount):
```tsx
companyName="SAIMÔR"
```

`RootPageContent` does not have company data in scope — it only has `useRuntimeSession`. Replace with empty string:
```tsx
companyName=""
```

The LockScreen renders without a company label. This is correct — the lock screen shows the user's name (`userName` is already wired), not the company brand.

- [ ] **Step 4: Run tests**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: same pass count. If snapshot tests fail, update snapshots:
```bash
npx jest --no-coverage --testPathPattern="__tests__" --updateSnapshot 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/os/surfaceProfile.ts components/home/UniverseView.tsx app/page.tsx
git commit -m "fix(interface): empty-string fallbackCompanyName — no hardcoded brand names shown to customers"
```

---

## Phase 2 — Signed Context Token in WORLD

### Task 3: Extend entry-token and add buildContextToken

**Files:**
- Modify: `WORLD/lib/entry-token.ts`
- Create: `WORLD/__tests__/contextToken.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `WORLD/__tests__/contextToken.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildContextToken, decodeContextToken } from '@/lib/entry-token';

describe('buildContextToken', () => {
    it('produces a two-part base64url.signature token', () => {
        const token = buildContextToken({
            id: 'audit-1',
            company: 'Müller GmbH',
            email: 'test@example.com',
            domain: 'mueller.de',
            score: 52,
            level: 'Mittleres Risiko',
            grade: 'C',
        }, 'test-secret');

        const parts = token.split('.');
        expect(parts).toHaveLength(2);
        expect(parts[0].length).toBeGreaterThan(10);
    });

    it('decodes payload without requiring secret', () => {
        const token = buildContextToken({
            id: 'audit-1',
            company: 'Müller GmbH',
            email: 'test@example.com',
            domain: 'mueller.de',
            score: 52,
            level: 'Mittleres Risiko',
            grade: 'C',
        }, 'test-secret');

        const payload = decodeContextToken(token);
        expect(payload?.company).toBe('Müller GmbH');
        expect(payload?.score).toBe(52);
        expect(payload?.grade).toBe('C');
    });

    it('payload includes exp 24h from now', () => {
        const before = Math.floor(Date.now() / 1000);
        const token = buildContextToken({
            id: 'audit-1',
            company: 'Test',
            email: 'a@b.com',
            domain: 'b.com',
            score: 80,
            level: 'Niedrig',
            grade: 'B',
        }, 'secret');
        const payload = decodeContextToken(token);
        expect(payload?.exp).toBeGreaterThanOrEqual(before + 86000);
    });
});
```

- [ ] **Step 2: Run — confirm failing**

```bash
cd C:/saimor/WORLD
npx vitest run __tests__/contextToken.test.ts 2>&1 | tail -10
```

Expected: FAIL — `buildContextToken` and `decodeContextToken` not exported.

- [ ] **Step 3: Implement in entry-token.ts**

Replace the full content of `WORLD/lib/entry-token.ts` with:

```ts
import crypto from 'crypto';

type ContextTokenPayload = {
    id: string;
    company: string;
    email: string;
    domain: string;
    score: number;
    level: string;
    grade?: string | null;
    summary?: string | null;
    actions?: string[];
    iat: number;
    exp: number;
};

function getEntrySecret() {
    const secret = process.env.SAIMOR_ENTRY_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV !== 'production') return 'local-dev-entry-secret';
    throw new Error('SAIMOR_ENTRY_SECRET is required');
}

export function buildContextToken(
    payload: Omit<ContextTokenPayload, 'iat' | 'exp'>,
    secret?: string,
): string {
    const now = Math.floor(Date.now() / 1000);
    const body: ContextTokenPayload = {
        ...payload,
        iat: now,
        exp: now + 60 * 60 * 24,
    };
    const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
    const sig = crypto
        .createHmac('sha256', secret ?? getEntrySecret())
        .update(encoded)
        .digest('base64url');
    return `${encoded}.${sig}`;
}

/** Decodes payload without verifying signature — for display-only use on the client. */
export function decodeContextToken(token: string): ContextTokenPayload | null {
    try {
        const [encoded] = token.split('.');
        return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ContextTokenPayload;
    } catch {
        return null;
    }
}

/** @deprecated Use buildContextToken instead */
export function signWebsiteEntryToken(
    payload: Omit<ContextTokenPayload, 'iat' | 'exp'>,
): string {
    return buildContextToken(payload);
}
```

- [ ] **Step 4: Run tests — confirm passing**

```bash
cd C:/saimor/WORLD
npx vitest run __tests__/contextToken.test.ts 2>&1 | tail -10
```

Expected: 3 tests PASS.

- [ ] **Step 5: Run full WORLD test suite**

```bash
cd C:/saimor/WORLD
npx vitest run --environment jsdom 2>&1 | tail -5
```

Expected: all 34 tests pass (existing tests still use `signWebsiteEntryToken` via the deprecated alias).

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/WORLD
git add lib/entry-token.ts __tests__/contextToken.test.ts
git commit -m "feat(world): buildContextToken + decodeContextToken — signed context token for OS entry"
```

---

### Task 4: Replace loose URL params with single ct= in WORLD

**Files:**
- Modify: `WORLD/components/ScanPage.tsx` — `buildHqUrl` function
- Modify: `WORLD/app/api/security-scan/route.ts` — import updated

- [ ] **Step 1: Update buildHqUrl in ScanPage.tsx**

Find the `buildHqUrl` function in `components/ScanPage.tsx` (around line 66). Replace it entirely:

```ts
function buildHqUrl(results: any) {
    const base = process.env.NEXT_PUBLIC_OS_HOME_URL || 'https://hq.saimor.world';
    const url = new URL(base);
    if (!url.pathname || url.pathname === '/') url.pathname = '/entry';

    const ct = buildContextToken({
        id: results.id || `local-preview-${Date.now()}`,
        company: results.companyName,
        email: results.email || '',
        domain: results.recon?.domain || results.target || '',
        score: results.score,
        level: scoreLabel(results.score),
        grade: results.grade ?? null,
        summary: results.summary ? String(results.summary).slice(0, 420) : null,
        actions: (results.recommendations ?? [])
            .slice(0, 3)
            .map((rec: any) => rec?.title)
            .filter(Boolean),
    });

    url.searchParams.set('ct', ct);
    return url.toString();
}
```

Add the import at the top of the file (with the other imports):
```ts
import { buildContextToken } from '@/lib/entry-token';
```

- [ ] **Step 2: Run WORLD tests**

```bash
cd C:/saimor/WORLD
npx vitest run --environment jsdom 2>&1 | tail -5
```

Expected: all 34+ tests pass.

- [ ] **Step 3: Commit**

```bash
cd C:/saimor/WORLD
git add components/ScanPage.tsx
git commit -m "feat(world): replace 10 loose URL params with single signed ct= context token"
```

---

## Phase 3 — CORE Cookie Unification

> **Note on CORE scope:** The spec describes a full stateless visitor session (no tenant assigned). That is deferred — it requires larger CORE refactoring. Phase 3 implements only the cookie name unification, which is the minimum needed for INTERFACE to have a single auth read path. The visitor still lands in `tenant-public-playground`; Phase 4 (INTERFACE visitor mode) prevents shared tenant data from being displayed.

### Task 5: Unify cookie name mora_public_token → mora_session in CORE

**Files:**
- Modify: `CORE/core/api/v3/playground.py`
- Modify: `CORE/core/api/v3/entry.py`

- [ ] **Step 1: Update playground.py cookie name**

In `core/api/v3/playground.py`, find all occurrences of `key="mora_public_token"` (lines ~424 and ~636). Change each to `key="mora_session"`.

There are two `set_cookie` calls in this file. Change both:
```python
response.set_cookie(
    key="mora_session",          # was: mora_public_token
    value=session_id,
    httponly=True,
    secure=config.ENVIRONMENT == "production",
    samesite="lax",
    max_age=max_age,
    domain=cookie_domain,
)
```

- [ ] **Step 2: Update entry.py cookie name**

In `core/api/v3/entry.py` line ~310, find `key="mora_auth_token"`. Change to `key="mora_session"`:
```python
response.set_cookie(
    key="mora_session",          # was: mora_auth_token
    value=session_id,
    ...
)
```

(The second `set_cookie` in entry.py at ~440 already uses `mora_session` — leave it as is.)

- [ ] **Step 3: Confirm no other cookie names remain**

```bash
cd C:/saimor/CORE
grep -rn "mora_public_token\|mora_auth_token" core/api/v3/ --include="*.py"
```

Expected: no output (all changed to `mora_session`).

- [ ] **Step 4: Commit CORE**

```bash
cd C:/saimor/CORE
git add core/api/v3/playground.py core/api/v3/entry.py
git commit -m "fix(core): unify session cookie name — mora_public_token + mora_auth_token → mora_session"
```

---

### Task 6: Remove mora_public_token branch in INTERFACE http.ts

**Files:**
- Modify: `INTERFACE/lib/api/http.ts`

- [ ] **Step 1: Simplify auth token resolution**

In `lib/api/http.ts`, find the `if (!options.skipAuth)` block (around line 91). Replace the entire token resolution block with:

```ts
if (!options.skipAuth) {
    const token = readCookie(AUTH_COOKIE) || readCookie('mora_session');
    const devToken = !token && isLocalhost()
        ? localStorage.getItem('saimor_dev_token')
        : null;
    const finalToken = token || devToken;

    if (finalToken) {
        if (isTokenExpired(finalToken)) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('saimor_dev_token');
            }
        } else {
            headers['Authorization'] = `Bearer ${finalToken}`;
        }
    }
}
```

Note: `AUTH_COOKIE` is already defined as `"mora_auth_token"` at the top of the file. Reading both `mora_auth_token` and `mora_session` means existing sessions using the old cookie name still work during the rollout period.

- [ ] **Step 2: Also clean up sessionLifecycle.ts**

In `lib/auth/sessionLifecycle.ts` around line 31, find the `clearSessionCookies` or `COOKIE_NAMES` array that references `mora_public_token`. Remove `mora_public_token` from it. Keep `mora_session` and `mora_auth_token`.

- [ ] **Step 3: Run INTERFACE tests**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: same pass count.

- [ ] **Step 4: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/api/http.ts lib/auth/sessionLifecycle.ts
git commit -m "fix(interface): remove mora_public_token branch — single mora_session read path"
```

---

## Phase 4 — INTERFACE Visitor Mode

### Task 7: Decode ct param and extend WebsiteEntryContext

**Files:**
- Modify: `INTERFACE/lib/websiteEntryContext.ts`
- Modify: `INTERFACE/app/entry/page.tsx`

- [ ] **Step 1: Add decodeContextToken to INTERFACE**

INTERFACE needs to decode the `ct` JWT payload (without crypto — display only). Add to `lib/websiteEntryContext.ts` at the top:

```ts
export function decodeCtParam(ct: string): Record<string, unknown> | null {
    try {
        const [encoded] = ct.split('.');
        return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}
```

- [ ] **Step 2: Update buildWebsiteEntryContext to accept ct**

In `lib/websiteEntryContext.ts`, update `buildWebsiteEntryContext` to prefer `ct` over loose params:

```ts
export function buildWebsiteEntryContext(query: Query): WebsiteEntryContext | null {
    // Prefer signed context token over loose params
    const ctParam = firstQueryValue(query.ct);
    const decoded = ctParam ? decodeCtParam(ctParam) : null;

    const surface = firstQueryValue(query.surface) ?? (decoded ? 'website' : undefined);
    const entity = firstQueryValue(query.entity) ?? (decoded ? 'security-audit' : undefined);
    const id = firstQueryValue(query.id) ?? (decoded ? String(decoded.id ?? '') : undefined);

    if (surface !== 'website' || !entity || !id) return null;

    // Context from signed token takes precedence; loose params are fallback for old links
    const companyParam = decoded
        ? String(decoded.company ?? '')
        : firstQueryValue(query.company);
    const email = decoded
        ? String(decoded.email ?? '')
        : firstQueryValue(query.email);
    const domain = decoded
        ? String(decoded.domain ?? '')
        : firstQueryValue(query.domain);
    const score = decoded
        ? parseScore(String(decoded.score ?? ''))
        : parseScore(firstQueryValue(query.score));
    const level = decoded
        ? String(decoded.level ?? '')
        : firstQueryValue(query.level);
    const grade = decoded
        ? String(decoded.grade ?? '')
        : firstQueryValue(query.grade);
    const summary = decoded
        ? String(decoded.summary ?? '')
        : firstQueryValue(query.summary);
    const entryToken = firstQueryValue(query.ct) || firstQueryValue(query.entry_token) || firstQueryValue(query.token);
    const actions = decoded
        ? (decoded.actions as string[] | undefined) ?? []
        : parseActions(firstQueryValue(query.actions));

    // rest of the existing function body unchanged from here...
    const companyName = normalizeCompanyName(companyParam, domain);
    const isAudit = entity === 'security-audit';

    return {
        surface,
        entity,
        id,
        companyName,
        email,
        domain,
        score,
        level,
        grade,
        summary,
        entryToken,
        title: isAudit ? 'Nightwatch Security Signal aus WORLD' : 'Digital AI Self Blueprint aus WORLD',
        rooms: [
            {
                name: 'Security',
                description: isAudit
                    ? riskRoomDescription(score)
                    : 'Sicherheitsleitplanken werden aus deinem Blueprint vorbereitet.',
                tone: score !== undefined && score < 70 ? 'risk' : 'setup',
            },
            {
                name: 'Betrieb',
                description: 'Mora bereitet Finder-Kontext, Verantwortlichkeiten und Routinen als isolierten Arbeitsraum vor.',
                tone: 'setup',
            },
            {
                name: 'Wachstum',
                description: 'Dashboard-Gedaechtnis und OS-Aufgaben werden getrennt, aber verbunden angelegt.',
                tone: 'growth',
            },
        ],
        documents: [
            {
                title: `${companyName} - Nightwatch Dossier`,
                description: summary || (domain ? `Oeffentlicher Nightwatch-Kontext fuer ${domain}` : 'Nightwatch-Kontext aus WORLD'),
            },
            {
                title: '14-Tage Massnahmenplan',
                description: actions.length > 0 ? actions.slice(0, 3).join(' / ') : 'Prioritaeten fuer die ersten Verbesserungen im HQ.',
            },
            {
                title: 'Betriebsmappe',
                description: email ? `Dashboard merkt Lead und Kontaktkontext: ${email}` : 'Platzhalter fuer echte Dokumente, sobald Tools verbunden werden.',
            },
        ],
        tasks: actions.length > 0 ? actions.slice(0, 4).map((title, index) => ({
            title,
            priority: (index === 0 && score !== undefined && score < 70 ? 'hoch' : 'mittel') as 'hoch' | 'mittel' | 'niedrig',
        })) : [
            {
                title: score !== undefined && score < 70 ? 'Nightwatch-Befunde zuerst klaeren' : 'Nightwatch-Ergebnis validieren',
                priority: (score !== undefined && score < 70 ? 'hoch' : 'mittel') as 'hoch' | 'mittel' | 'niedrig',
            },
            {
                title: 'Finder-Dossier mit Verantwortlicher Person verbinden',
                priority: 'mittel' as const,
            },
            {
                title: 'Echte Tools erst nach Freigabe verbinden',
                priority: 'niedrig' as const,
            },
        ],
    };
}
```

- [ ] **Step 3: Update entry/page.tsx to pass ct through**

In `app/entry/page.tsx`, the existing `buildWebsiteEntryContext(resolved)` call passes the full `resolved` query object. Since we added `ct` handling inside `buildWebsiteEntryContext`, no change to page.tsx is needed — the `ct` param is already in `resolved`.

Verify this by checking that `resolved` includes all searchParams including `ct`:
```ts
const resolved = (await searchParams) ?? {};
// resolved will contain { ct: '<token>' } when new WORLD link is used
const websiteContext = buildWebsiteEntryContext(resolved);
// This now works with ct= param
```

No change needed to page.tsx — confirm by reading lines 25–45.

- [ ] **Step 4: Run INTERFACE tests**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: same pass count.

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/websiteEntryContext.ts
git commit -m "feat(interface): decode ct= signed context token — no more loose URL param trust"
```

---

### Task 8: Add visitor activeMode and lock company identity

**Files:**
- Modify: `INTERFACE/lib/store/navStore.ts`
- Modify: `INTERFACE/components/entry/SecurityCheckPlaygroundLogin.tsx`
- Modify: `INTERFACE/components/os/shell/MoraShell.tsx`

- [ ] **Step 1: Add visitor to navStore activeMode union**

In `lib/store/navStore.ts`, find the `activeMode` type (line 28):
```ts
activeMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview';
```

Change to:
```ts
activeMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor';
```

Also update the `setActiveMode` signature (line 46):
```ts
setActiveMode(mode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor'): void;
```

- [ ] **Step 2: Update SecurityCheckPlaygroundLogin to set visitor mode**

In `components/entry/SecurityCheckPlaygroundLogin.tsx`, find the line:
```ts
useNavStore.getState().setActiveMode('personal_demo');
```

Change to:
```ts
useNavStore.getState().setActiveMode('visitor');
```

- [ ] **Step 3: Lock company identity in MoraShell for visitor mode**

In `components/os/shell/MoraShell.tsx`, find where `activeMode` is read from navStore. Add a guard that skips the `loadCompanies()` call in visitor mode.

Find the `useEffect` that calls `loadCompanies` (search for `loadCompanies` in MoraShell.tsx). Add a guard:

```ts
useEffect(() => {
    if (activeMode === 'visitor') return; // visitor has no tenant — no companies to load
    loadCompanies();
}, [activeMode, loadCompanies]);
```

Find the `displayCompany` memo in MoraShell (around line 384). Add a visitor branch at the top:

```ts
const displayCompany = React.useMemo(() => {
    // Visitor mode: identity comes only from websiteEntryContext — no API company
    if (activeMode === 'visitor' && websiteEntryContext?.companyName) {
        return {
            id: `visitor-${websiteEntryContext.id || 'scan'}`,
            tenant_id: 'visitor',
            owner_id: 'visitor',
            name: websiteEntryContext.companyName,
            slug: websiteEntryContext.companyName.toLowerCase().replace(/\s+/g, '-'),
            description: websiteEntryContext.summary || '',
            logo_url: null,
            settings: null,
            is_demo: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }
    // ... existing logic unchanged below
```

- [ ] **Step 4: Run INTERFACE tests**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: same pass count.

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/store/navStore.ts components/entry/SecurityCheckPlaygroundLogin.tsx components/os/shell/MoraShell.tsx
git commit -m "feat(interface): visitor activeMode — company identity from context only, no API loadCompanies"
```

---

### Task 9: Empty states for content panes in visitor mode

**Files:**
- Modify: `INTERFACE/components/os/shell/MoraShell.tsx` (or the relevant pane components)

- [ ] **Step 1: Identify which panes load data in visitor mode**

The visitor dock shows 4 items per `getPlaygroundDockItems()` in `lib/surface/surfaceRegistry.ts`:
- `dossier` — reads from `websiteEntryContext` → already works
- `mora-hub` / chat — reads from chat API → needs guard
- `wall` — reads Wall API → needs guard
- `settings` — no API → fine

For any pane that is NOT `dossier` and attempts an API call in visitor mode, the call will fail (visitor has no real tenant). The pane should show an empty state rather than an error.

- [ ] **Step 2: Add visitor guard to pane data hooks**

Find `components/panes/FinderPane.tsx`. At the top of the data-fetching effect, add:

```ts
const activeMode = useNavStore((s) => s.activeMode);
// ...
useEffect(() => {
    if (activeMode === 'visitor') return; // visitor has no data
    // existing fetch logic...
}, [activeMode, ...existingDeps]);
```

Repeat this pattern for:
- `components/panes/FinderPane.tsx`
- Any pane that uses `useQuery` with a CORE endpoint

For panes using TanStack Query, pass `enabled: activeMode !== 'visitor'` to the query:
```ts
const { data } = useQuery({
    queryKey: [...],
    queryFn: ...,
    enabled: activeMode !== 'visitor',
});
```

When `enabled: false`, TanStack Query returns `data: undefined` without making a network call. The pane renders its empty state.

- [ ] **Step 3: Run full test suite**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Expected: same pass count.

- [ ] **Step 4: Commit**

```bash
cd C:/saimor/INTERFACE
git add components/panes/
git commit -m "feat(interface): disable data fetching in visitor mode — genuine empty states, no shared tenant data"
```

---

## Verification

After all phases are complete:

- [ ] **End-to-end check:**
  1. Start WORLD dev server: `cd C:/saimor/WORLD && npm run dev`
  2. Complete a security scan in WORLD
  3. Verify the generated OS link contains `?ct=<token>` and NOTHING ELSE (no `company=`, `domain=`, `score=` visible in URL)
  4. Click the link → `/entry` in INTERFACE
  5. Confirm `SecurityCheckEntry` shows the correct company name
  6. Click through to `/home`
  7. Confirm company name in OS header matches the scan company — NOT "Saimor HQ"
  8. Confirm no "Simple Coffee Group" anywhere
  9. Open Finder pane → empty state (no data)
  10. Open Dossier → scan results visible

- [ ] **No loose params in URL:**
```bash
# The ct token should be the only query param
echo "Check that buildHqUrl only sets ct="
cd C:/saimor/WORLD && grep -A 20 "function buildHqUrl" components/ScanPage.tsx | grep "searchParams.set"
```
Expected: only `url.searchParams.set('ct', ct);`

- [ ] **No hardcoded names remain:**
```bash
cd C:/saimor/INTERFACE && grep -rn "Saimor HQ\|Simple Coffee Group" components/ lib/ app/ --include="*.tsx" --include="*.ts" | grep -v "node_modules\|test\|spec\|.md"
```
Expected: no output (or only in comments/non-rendering code).

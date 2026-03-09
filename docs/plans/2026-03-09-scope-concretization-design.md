# Scope Concretization Pass — Design

**Date:** 2026-03-09
**Backend baseline:** Core `e2fa9d1`
**UI baseline:** `ad5b96d`
**Approach:** C — `useMoraContext()` as single normalization layer, session-backed operational state

---

## Problem

The backend now enforces company-backed scope by default and exposes operational state explicitly via `/v3/auth/session`. The frontend has not caught up:

1. `UserProfile` / `User` store shape do not include the new session fields (`operational_state`, `setup_required`, `active_company_id`, `active_company_name`)
2. `useMoraContext()` / `MoraContextSnapshot` have no `isOperational` field — consumers cannot branch on operational vs setup-required state
3. `IntelligenceContextBar` shows `'Gesamter Workspace'` when no scope is present — a vague global label that contradicts the product model
4. ChatPane, MoraHub, MemorySidebar have no setup-required empty states — when the backend refuses to serve a vague context, the UI has nothing to show

## Product model (confirmed)

| State | Trigger | UI target |
|---|---|---|
| Unauthenticated | No session | Login screen (unchanged) |
| Setup-required | Logged in, `setup_required = true` | Explicit setup/onboarding empty state per surface |
| Operational | Logged in, `operational_state = "operational"` | Concrete company scope everywhere, no vague labels |

`tenant_default_company` is a backend resolution detail. It must **not** appear in main UX. When the backend resolves a default company, the frontend simply shows the company name. `scope_source` is stored for diagnostics/admin use only.

---

## Architecture: one truth, one hook

`useMoraContext()` is the single normalization layer. Every surface reads `MoraContextSnapshot`. No surface computes operational state independently.

```
/v3/auth/session ──► fetchUserProfile() ──► UserProfile (coreClient)
                                                │
                                           setUser() mapping
                                                │
                                          User (moraState)
                                                │
/v3/chat/stream ──► useMoraStream() ──► lastChatScope (moraState)
                                                │
                                      useMoraContext() [normalizer]
                                                │
                                      MoraContextSnapshot
                                      ├─ isOperational: boolean  ← NEW
                                      ├─ scopeSource: string | null  ← NEW
                                      └─ (existing fields unchanged)
                                                │
                          ┌─────────────────────┼──────────────────────┐
                     ChatPane            MoraHubPane         MemorySidebar
                  IntelligenceContextBar
```

---

## Layer 1: Data — `coreClient.ts` and `moraState.ts`

### `lib/api/coreClient.ts`

Extend `UserProfile` (the `/v3/auth/session` response shape):

```typescript
export interface UserProfile {
    user_id: string;
    email?: string;
    full_name?: string;
    role: AccountRole;
    tenant_id: string;
    scope?: string;
    demo_mode?: boolean;
    // NEW — session operational contract (Core e2fa9d1+)
    operational_state?: 'operational' | 'setup_required';
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
    scope_source?: string;
}
```

All new fields are optional — safe for older backends.

### `lib/store/moraState.ts`

**Extend `User` interface** with the fields that must survive the `UserProfile → User` mapping:

```typescript
export interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: UserRole;
    settings?: Record<string, unknown>;
    tenant_id?: string;
    // NEW — session operational contract
    operational_state?: 'operational' | 'setup_required';
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
}
```

**Extend `ResolvedScope`** to make `scope_source` explicit:

```typescript
export interface ResolvedScope {
    company_id?: string;
    department_id?: string;
    space_id?: string;
    folder_id?: string;
    scope_source?: string;        // ← NEW: backend resolution provenance
    [key: string]: string | undefined;
}
```

**Wherever `UserProfile` is mapped to `User`** (likely in `setUser()` or a `useAccount`-style hook), pass through the new fields.

---

## Layer 2: Normalization — `useMoraContext.ts`

### New `MoraContextSnapshot` fields

```typescript
export interface MoraContextSnapshot {
    // ... all existing fields unchanged ...

    // NEW
    isOperational: boolean;       // true = concrete company context available
    scopeSource: string | null;   // backend scope_source — diagnostics/admin only
}
```

### `isOperational` derivation

Priority order (first truthy wins):

1. `user?.operational_state === 'operational'` — backend truth from session
2. `!!(resolved_scope?.company_id ?? activeCompanyId)` — heuristic fallback for the gap before session data arrives
3. `false`

```typescript
const isOperational =
    user?.operational_state != null
        ? user.operational_state === 'operational'
        : !!(resolvedCompanyId ?? activeCompanyId);
```

### Pre-chat company label

When `lastChatScope` has not yet arrived (no messages sent), use `user?.active_company_name` as the fallback for `scopeLabels.company`:

```typescript
const companyLabel =
    resolvedCompanyName             // from lastChatScope (highest priority)
    ?? activeCompany?.name          // from store entity
    ?? user?.active_company_name    // ← NEW: from session bootstrap
    ?? undefined;
```

### `scopeSource`

```typescript
scopeSource: lastChatScope?.resolved_scope?.scope_source ?? null,
```

**Never pass `scopeSource` to `MoraContextChip` or any main-UX component.** It is available on the snapshot for admin/diagnostics panes only.

---

## Layer 3: Surfaces

### `MoraContextChip` — no changes

It already returns `null` when `scopeLabels` is empty. Surfaces handle the empty-state UX — the chip does not.

### `components/layers/IntelligenceContextBar.tsx`

**Remove `'Gesamter Workspace'` fallback.** When `scopeParts` is empty:

```typescript
// Before:
const scopeLabel = scopeParts.length > 0 ? scopeParts.join(' › ') : 'Gesamter Workspace';

// After:
const scopeLabel = scopeParts.join(' › ');  // empty string when no scope — bar auto-hides
```

No other changes to this component.

### `components/panes/ChatPane.tsx`

Read `isOperational` from `useMoraContext()`. When `false`, replace the message composer area with an inline setup-required card. Message history and header remain visible.

```tsx
// In the composer section:
{isOperational ? (
    <MessageComposer ... />
) : (
    <SetupRequiredCard
        title="Kein Workspace konfiguriert"
        body="Richte eine Firma oder einen Workspace ein, um Mora nutzen zu können."
        action={{ label: 'Einstellungen öffnen', onClick: () => openPane({ type: 'settings' }) }}
    />
)}
```

`SetupRequiredCard` is a small inline component (not a new file — defined in or alongside ChatPane). It uses the existing pane/card visual language.

### `components/panes/MoraHubPane.tsx`

In the Overview tab, branch on `isOperational` before rendering the context chip and stats:

```tsx
{isOperational ? (
    <>
        <MoraContextChip variant="hub" snapshot={ctx} />
        {/* existing stats / overview content */}
    </>
) : (
    <SetupRequiredState
        message="Richte einen Workspace ein, damit Mora operativ wird."
    />
)}
```

### `components/os/MemorySidebar.tsx`

When `isOperational === false`, suppress the memory input and memory list. Show a passive note:

```tsx
{isOperational ? (
    <>{/* existing memory input + list */}</>
) : (
    <p className="text-xs text-muted-foreground px-4 py-6">
        Speicher ist verfügbar, sobald ein Workspace eingerichtet ist.
    </p>
)}
```

The sidebar toggle and chrome remain visible — do not hide the sidebar entirely.

---

## Files changed

| File | Type | Change |
|---|---|---|
| `lib/api/coreClient.ts` | extend interface | Add 5 optional fields to `UserProfile` |
| `lib/store/moraState.ts` | extend interfaces | Add fields to `User`; add `scope_source?` to `ResolvedScope` |
| `lib/mora/useMoraContext.ts` | new derivation | `isOperational`, `scopeSource`, pre-chat company label fallback |
| `components/layers/IntelligenceContextBar.tsx` | remove label | Delete `'Gesamter Workspace'` fallback string |
| `components/panes/ChatPane.tsx` | branch | `isOperational` gate on composer |
| `components/panes/MoraHubPane.tsx` | branch | `isOperational` gate on Overview tab |
| `components/os/MemorySidebar.tsx` | branch | `isOperational` gate on memory input |

**7 files. No new store. No new actions beyond field additions. No new hook.**

---

## What does NOT change

- `MoraContextChip` — unchanged
- All API clients (`coreClient` endpoints, `realtimeClient`, etc.)
- Store slices, actions, or computed selectors
- `useMoraStream` — `scope_source` already flows through the `resolved_scope` record via the index signature; no parsing changes needed
- `scopeLevel: 'global'` — kept in snapshot for diagnostics backward compat; no surface renders it as a user-facing label

---

## QA prompts (from Codex spec)

After implementation, test live with:

- **"was weißt du gerade?"** → answer should reference a concrete company, not a void
- **"was kannst du mir vorschlagen?"** → answer should feel scoped, chip/header should agree

Success criteria:
- Chip shows company name immediately on session load (pre-chat)
- Chip and hub agree after a message is sent
- No surface shows `'Gesamter Workspace'` or `tenant_default_company`
- `setup_required = true` path shows setup-required card (not a broken blank)

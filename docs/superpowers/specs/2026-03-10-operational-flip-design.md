# Design: Event-Driven `setup_required → operational` Flip

**Date:** 2026-03-10
**Status:** Approved
**Scope:** mora-ui frontend only — no Core changes required

---

## Problem

When a new user completes company setup (Core creates the company and transitions
`operational_state` from `setup_required` to `operational`), the UI does not
reflect this without a full page reload.

Root cause: `isOperational` in `useMoraContext` is derived from
`user.operational_state` in Zustand. That field is set once at bootstrap from
`/v3/auth/session` and never updated again unless the user reloads.

---

## Goal

Flip the UI from `setup_required` to `operational` reactively — no reload,
no re-bootstrap — when Core signals that setup is complete.

---

## Architecture

### `isOperational` derivation (unchanged)

```
useMoraContext.ts
  └── user.operational_state (Zustand) → isOperational: boolean | null
```

Changing `user.operational_state` in the store is sufficient.
Every surface that reads `isOperational` re-renders automatically.
`useMoraContext`, `useAuthBootstrapper`, and all existing render paths
remain untouched.

### WebSocket event routing (existing infrastructure)

`realtimeClient` subscribes with `event_types=all` and routes:

```
ws message → payload.event_type → this.emit(event_type, payload.data)
```

`realtime.on('company_created', handler)` already works today.

---

## Design

### Unit 1 — `patchOperationalSession` store action

**Location:** `lib/store/moraState.ts` — added to `MoraState` interface and
store implementation.

```ts
patchOperationalSession: (patch: Partial<Pick<User,
  | 'operational_state'
  | 'setup_required'
  | 'active_company_id'
  | 'active_company_name'
  | 'company_count'
>>) => void
```

**Behaviour:**
- No-op if `user === null` (guard)
- Patches only the listed session-derived fields on the existing `user` object
- Does NOT touch: `role`, `permissions`, `viewMode`, `localStorage`, `name`,
  `email`, `tenant_id` — those don't change during an operational flip
- The patch keeps the flip coherent: when `operational_state` becomes
  `'operational'`, the concrete company fields are populated in the same update

**Why not `setUser`?**
`setUser` recalculates permissions, viewMode, and writes localStorage.
None of those need to change during an operational flip; calling `setUser`
would re-trigger unrelated side-effects and be harder to reason about.

---

### Unit 2 — `useOperationalFlip` hook

**Location:** `lib/hooks/useOperationalFlip.ts` (new file)

**Enabled when:** `user?.operational_state === 'setup_required'`
(skip registration entirely if already operational or null)

**Event types listened for:**
- `company_created` — primary signal: company was just created
- `setup_complete` — dedicated completion signal if Core sends it
- Tolerate `onboarding_done` as an alias if it appears in practice

**Flow on event:**

```
realtime event arrives
  → call GET /v3/auth/session  (isOptional: true, skipAuth: true)
  → if result?.operational_state === 'operational':
      patchOperationalSession({
        operational_state: 'operational',
        setup_required:    false,
        active_company_id:   result.active_company_id,
        active_company_name: result.active_company_name,
        company_count:       result.company_count,
      })
      loadCompanies()   ← background, not awaited for UI unblock
```

**Deduplication:** use a `handledRef` (`useRef<boolean>`) so that if both
`company_created` and `setup_complete` fire within the same setup flow, only
the first successful session re-fetch triggers the patch. Reset on unmount.

**Cleanup:** `return () => { realtime.off('company_created', handler); realtime.off('setup_complete', handler); }`

---

### Unit 3 — Mount in `MoraShell`

**Location:** `components/os/shell/MoraShell.tsx`

```ts
useOperationalFlip();
```

One line, alongside the existing `useActionEvents` call. No props, no
conditional wrapping needed — the hook guards itself internally.

---

## Session fields patched

| Field | Source | Why needed |
|---|---|---|
| `operational_state` | `/v3/auth/session` | Drives `isOperational` flip |
| `setup_required` | `/v3/auth/session` | Keeps setup flag consistent |
| `active_company_id` | `/v3/auth/session` | Company now exists; needed for scope resolution |
| `active_company_name` | `/v3/auth/session` | Pre-chat company label in `useMoraContext` |
| `company_count` | `/v3/auth/session` | Used by downstream company selectors |

Fields NOT patched (unchanged during flip):
`id`, `name`, `email`, `role`, `tenant_id`, `settings`, `avatar`

---

## What does NOT change

| Component / Hook | Reason |
|---|---|
| `useMoraContext` | Reactive to store; no touch needed |
| `useAuthBootstrapper` | Handles cold-start only; no touch |
| `useActionEvents` | Handles action CRUD; separate concern |
| `realtimeClient` | Already subscribes to all events |
| All setup/onboarding UI components | They read `isOperational`; ungate automatically |

---

## Files changed

| File | Change type |
|---|---|
| `lib/store/moraState.ts` | Add `patchOperationalSession` (~12 lines) |
| `lib/hooks/useOperationalFlip.ts` | New hook (~50 lines) |
| `components/os/shell/MoraShell.tsx` | +1 hook call |
| `__tests__/lib/hooks/useOperationalFlip.test.ts` | New test file (TDD) |

---

## Test cases (TDD)

1. **No-op when already operational** — hook registers nothing
2. **Event `company_created` → session returns `operational`** → `patchOperationalSession` called with correct fields + `loadCompanies` called once
3. **Event `setup_complete` → session returns `operational`** → same as above
4. **Deduplication** — both events fire; session called once; patch called once
5. **Session returns `setup_required`** (race: event early) → no patch, no loadCompanies
6. **Session request fails (isOptional)** → no patch, no loadCompanies, no throw
7. **Cleanup** — realtime listeners removed on unmount

---

## Non-goals

- No polling
- No full re-bootstrap
- No page reload
- No second source of truth for `operational_state`
- No changes to Core
- No changes to existing render paths

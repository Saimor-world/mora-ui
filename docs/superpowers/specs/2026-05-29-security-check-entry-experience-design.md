# Security Check Entry Experience — Design Spec

**Status:** Approved  
**Date:** 2026-05-29

---

## Goal

When a visitor completes a Security Check on saimor.world and clicks "OS öffnen", they should experience a designed, immersive entry that:

1. Greets them personally with their scan results (company name, domain, score)
2. Makes the score understandable — narrative statement + visual dimension bars
3. Explains what SAIMÔR is in the same moment
4. Transitions them into the **shared public Playground** — a real, data-rich OS environment
5. Auto-opens their personal Dossier pane and Môra (who knows their scan context) when they land

The 20-day personal dossier node lives inside the Playground tenant as their private layer on top of the shared experience.

---

## User Journey

```
saimor.world Security Check
        ↓
/entry?surface=website&entity=security-audit&...
        ↓
SecurityCheckEntry (full-screen, 1920×1080)
  Left:  "Hallo, [companyName]." + Score (B+C) + CTA
  Right: What is SAIMÔR + 3 Features + Môra strip
        ↓
Click "Workspace öffnen"
  → POST /v3/playground/guest-session (silent, in background while visitor reads)
  → saveWebsiteEntryContext()
  → activeMode = 'personal_demo'
        ↓
/home (Playground tenant)
  → useCreateDossierNode fires (creates 20d node in playground)
  → useAutoOpenDossier fires once:
      • opens Dossier pane with node
      • opens Môra chat with context-aware greeting
  → Full OS available: Universe, Finder, all features
```

---

## Part 1 — SecurityCheckEntry Component

**File:** `components/entry/SecurityCheckEntry.tsx`

**Layout:** Full-screen two-column (1920×1080 target)

### Left column
- SAIMÔR logo + route label in topbar
- Eyebrow chip: "Dein Workspace ist bereit" (pulsing dot)
- Greeting: `Hallo, [companyName].`
- Domain + date: `[domain] · Security Check [date]`
- **Score block:**
  - Large number: `[score]` with gradient
  - Badge: level (Mittleres Risiko / Kritisch / Solide Basis)
  - Narrative statement (from `buildScoreNarrative()`): `"[domain] ist online — hat aber [N] Lücken, die heute schließbar sind."`
  - Sub-text: `"Der Score misst Sicherheit, Performance und Erreichbarkeit — jede Dimension mit konkreten Befunden."`
  - 4 dimension bars (from `scoreBreakdown()`): SSL, Security Headers, Performance, Erreichbarkeit — each with label + value text + colored bar
- CTA: `Workspace öffnen →` + sub-note `Kein Account · Isolierter Demo-Space`

### Right column
- Section label: "Was dich erwartet"
- Headline: `"Dein Scan-Ergebnis als lebender Workspace."`
- Body: explains SAIMÔR OS in 2 sentences
- 3 feature tiles: Universe, Finder, Môra — each with icon + title + 1-line desc
- Môra strip: `"✦ Môra kennt bereits dein Ergebnis. Frag sie: 'Was sind meine drei dringendsten Maßnahmen?'"`

### Auth
- `SecurityCheckPlaygroundLogin` handles auth silently
- Auth starts immediately on mount (while visitor reads)
- CTA click triggers redirect after auth completes (or waits if still in-flight)

---

## Part 2 — SecurityCheckPlaygroundLogin

**File:** `components/entry/SecurityCheckPlaygroundLogin.tsx`

Replaces `WebsiteEntryTokenLogin` for this flow. Key difference: calls playground endpoint instead of isolated preview.

```
POST /v3/playground/guest-session
Body: {
  email: `visitor-{sessionSuffix}@{domain}`,
  name: companyName,
  visitor_id: localStorage.getItem('saimor_visitor_id') || generated
}
```

On success:
1. `saveWebsiteEntryContext(context, { openOnHome: true })`
2. `useNavStore.getState().setActiveMode('personal_demo')`
3. `window.location.href = '/home'`

On error: silent — show retry state in `SecurityCheckEntry`.

---

## Part 3 — scoreBreakdown (pure utility)

**File:** `lib/dossier/scoreBreakdown.ts`

Pure function: `WebsiteEntryContext → ScoreDimension[]`

```ts
interface ScoreDimension {
  id: 'ssl' | 'headers' | 'performance' | 'availability';
  label: string;
  value: string;     // human-readable: "Kritisch · 12 Tage" / "2 von 6" / "3.2s LCP" / "Alles online"
  status: 'critical' | 'warn' | 'ok';
  barPercent: number; // 0-100
}
```

**Mapping logic** (derived from `context.tasks` + `context.score`):
- Tasks containing "SSL" or "Zertifikat" → ssl dimension, `critical` if present
- Tasks containing "Header" or "CSP" or "HSTS" → headers dimension, count from task title if parseable
- Tasks containing "Ladezeit" or "Performance" or "LCP" → performance dimension
- If no tasks map to a dimension → `ok` with 100% bar
- `barPercent` scales inversely with severity: critical=15-25%, warn=30-65%, ok=100%

Also exports `buildScoreNarrative(context): string`:
- Counts tasks with priority 'hoch' → `N Lücken`
- Returns: `"[domain] ist online — hat aber [N] Lücken, die heute schließbar sind."` (or variant for score ≥ 80)

---

## Part 4 — useAutoOpenDossier hook

**File:** `lib/hooks/useAutoOpenDossier.ts`

Fires **once** per websiteEntryContext.id (localStorage flag `saimor_dossier_auto_opened_{id}`).

```ts
function useAutoOpenDossier(
  context: StoredWebsiteEntryContext | null,
  dossierNodeId: string | null
): void
```

When conditions met (context present, nodeId ready, not yet fired):
1. After 800ms delay (let OS settle)
2. `openPane({ id: 'dossier-main', type: 'document', title: '[companyName] Dossier', data: { nodeId: dossierNodeId }, size: { width: 760, height: 620 } })`
3. After 1400ms: `openPane({ id: 'chat-main', type: 'chat', ... })` AND inject Môra context message via `useChatStore`

**Môra context message:**
```
"Hallo! Ich habe dein Security Check für [domain] gelesen.

Dringendster Punkt: [first hoch-priority task]. [context-specific detail if available].

Soll ich dir die Schritte zur Behebung erklären?"
```

The message is injected as an initial assistant message in the chat store, so it appears instantly when the chat pane opens.

---

## Part 5 — openWebsiteDossier fix

**File:** `components/home/HomeSurface.tsx`

**Current (broken):** Opens `website-dossier` pane with `data: { context }` — but the app reads `initialData.url` → gets empty string → broken.

**Fixed:**
```ts
const openWebsiteDossier = useCallback(() => {
  if (!websiteEntryContext) return;
  if (dossierNodeId) {
    // Node exists: open the real document
    revealPane('dossier-main', {
      type: 'document',
      title: `${websiteEntryContext.companyName} Dossier`,
      size: { width: 760, height: 620 },
      data: { nodeId: dossierNodeId },
    });
  } else if (websiteEntryContext.domain) {
    // Fallback: live URL check
    revealPane('website-dossier-current', {
      type: 'website-dossier',
      title: `${websiteEntryContext.companyName} Dossier`,
      size: { width: 1040, height: 720 },
      data: { url: `https://${websiteEntryContext.domain}` },
    });
  }
}, [revealPane, websiteEntryContext, dossierNodeId]);
```

---

## Part 6 — entry/page.tsx routing

**File:** `app/entry/page.tsx`

Route `websiteContext` with `entity === 'security-audit'` → `SecurityCheckEntry`  
Route `websiteContext` with `entity === 'digital-blueprint'` → `DemoWelcomeCardClient` (unchanged)  
Route `mode === 'demo'` → `DemoDirectEntry` (unchanged)

```tsx
if (websiteContext && websiteContext.entity === 'security-audit') {
  return <SecurityCheckEntry context={websiteContext} />;
}
if (websiteContext) {
  return <DemoWelcomeCardClient context={websiteContext} />;  // digital-blueprint
}
```

---

## File Map

| File | Action |
|---|---|
| `components/entry/SecurityCheckEntry.tsx` | Create |
| `components/entry/SecurityCheckPlaygroundLogin.tsx` | Create |
| `lib/dossier/scoreBreakdown.ts` | Create |
| `lib/hooks/useAutoOpenDossier.ts` | Create |
| `components/home/HomeSurface.tsx` | Modify (fix openWebsiteDossier + add useAutoOpenDossier) |
| `app/entry/page.tsx` | Modify (route security-audit to SecurityCheckEntry) |
| `__tests__/lib/dossier/scoreBreakdown.test.ts` | Create |
| `__tests__/lib/hooks/useAutoOpenDossier.test.tsx` | Create |
| `__tests__/components/entry/SecurityCheckEntry.test.tsx` | Create |

---

## Part 7 — Wall Entry (Phase 2: "Auf die Wall")

### Vision

The visitor's 20-day dossier is temporary — a snapshot. When they choose to put it on the Wall, they exchange impermanence for visibility. They become a named contact in SAIMÔR's network, their company appears publicly, and SAIMÔR has a real lead. No form, no sales call — they self-select.

The WORLD website Wall is deleted and rebuilt as a pure mirror of the Playground Wall. The Playground owns the data, WORLD only displays it.

### The Exchange

| Before | After |
|---|---|
| Anonymous visitor | Netzwerk-Kontakt |
| 20-day dossier (expires) | Permanent Wall entry |
| No relationship | SAIMÔR has email + domain |
| Private findings | Publicly visible card |

### "Auf die Wall" Flow

1. Visitor clicks "Auf die Wall" in the Dossier pane or HomeSurface card
2. **Consent sheet** appears (bottom drawer, not modal):
   - Shows exactly what will be public: company name, domain, score, level — NO task details, NO personal data
   - Email field (required — this is the lead capture)
   - Checkbox: "Ich stimme zu, dass mein Unternehmen auf der SAIMÔR-Wall sichtbar ist"
   - Checkbox: "SAIMÔR darf mich kontaktieren" (optional, but encouraged)
   - Privacy link + GDPR note
3. On confirm:
   - `POST /v3/wall/entries` (new CORE endpoint) with `{ domain, companyName, score, level, email, consented_at }`
   - Node metadata updated: `{ wall_entry: true, wall_entry_id: ..., expires_at: null }` — 20-day TTL removed
   - `activeMode` gets `supporter` flag: `localStorage.setItem('saimor_supporter', 'true')`
4. **Playground honors the commitment:**
   - Supporter chip appears in HomeSurface header: `🌐 Netzwerk-Mitglied`
   - Môra sends a new message: `"Dein Dossier ist jetzt Teil der SAIMÔR-Wall. Danke — und willkommen im Netzwerk."`
   - The "Auf die Wall" button transforms to `✓ Auf der Wall` (disabled, confirmed state)

### Wall Entry Data Model

**Public** (visible on WORLD wall):
```ts
interface WallEntry {
  id: string;
  company_name: string;   // "Acme GmbH"
  domain: string;         // "acme.de"
  score: number;          // 62
  level: string;          // "Mittel"
  joined_at: string;      // "Mai 2026"
}
```

**Private** (stored in CORE, never public):
```ts
  email: string;
  consented_contact: boolean;
  context_id: string;
```

### WORLD Wall (Mirror)

- `GET https://api.saimor.world/v3/wall/entries` → public list
- WORLD fetches this on page load, renders cards
- WORLD has no write access to the Wall — only reads
- Current WORLD Wall page is deleted, replaced with this mirror
- **WORLD change is a separate deployment** (not in INTERFACE plan)

### Files added for Phase 2

| File | Action |
|---|---|
| `components/entry/WallConsentSheet.tsx` | Create — consent bottom drawer |
| `lib/wall/wallClient.ts` | Create — `submitWallEntry()` API call |
| `lib/wall/wallStorage.ts` | Create — localStorage `saimor_wall_entry_id` |
| `components/home/HomeSurface.tsx` | Modify — supporter chip + "Auf die Wall" complete state |

---

## What is NOT in scope

- CORE backend `/v3/wall/entries` endpoint (separate CORE task)
- `DemoDirectEntry` / generic demo flow (unchanged)
- `DemoWelcomeCard` / digital-blueprint flow (unchanged)
- VAPI/phone call logic (must remain untouched)
- Multi-company or real-user flows
- WORLD Wall mirror (separate WORLD deployment after CORE endpoint exists)

---

## Security Notes

- Playground is shared — the dossier node has `metadata.source: 'website-entry'` and `metadata.context_id` for identification
- No real user data is stored in dossier — only scan results from WORLD
- 20-day TTL via `metadata.expires_at` — removed when Wall entry confirmed
- `activeMode = 'personal_demo'` prevents access to real HQ features
- Wall entries: email stored server-side only, never in localStorage or public API
- GDPR: explicit double-opt-in (public display consent + contact consent separate)

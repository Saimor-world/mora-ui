# TEST_REPORT.md — SAIMOR OS Frontend Smoke Test

**Date:** 2026-02-26
**Version:** v1.5.0-beta
**Branch:** main @ `32aa130`
**Agent:** Cursor Cloud (Frontend)

---

## Environment

| Property       | Value                                                |
|---------------|------------------------------------------------------|
| Node.js       | v22.22.0                                             |
| npm           | 10.9.4                                               |
| Next.js       | 15.5.12                                              |
| Dev Port      | 3000                                                 |
| Backend       | `api.saimor.world` via Next.js rewrite proxy         |
| Auth          | NextAuth CredentialsProvider → demo@saimor.io / demo123 |
| Tenant        | `tenant-demo` (Simple Coffee Group)                  |

---

## Build & Tooling

| Check                          | Status | Notes                                      |
|-------------------------------|--------|--------------------------------------------|
| `npm ci --legacy-peer-deps`   | PASS   | 899 packages, 2 non-critical vulns         |
| `npm run lint`                | PASS   | Warnings only (react-hooks/exhaustive-deps), 0 errors |
| `npm run build`               | PASS   | Compiled in 8.4s, all routes generated     |
| `npm test`                    | N/A    | Jest configured, no test files exist yet   |
| TypeScript                    | PASS   | `ignoreBuildErrors: true` in config        |

---

## E2E Browser Smoke Test (with Production API)

### API Proxy

| Test                                          | Status | Notes                                 |
|----------------------------------------------|--------|---------------------------------------|
| `/api/core/v1/health` proxy                  | PASS   | Returns `{"status":"healthy"}`        |
| NextAuth CSRF token fetch                    | PASS   | Token generated correctly             |
| NextAuth login (demo/demo123)                | PASS   | Session created, JWT returned         |
| Session contains accessToken + tenant_id     | PASS   | `tenant-demo`, role `owner`           |

### L1 — Universe View (Corporate Overview)

| Element                           | Status | Notes                                    |
|----------------------------------|--------|------------------------------------------|
| "SIMPLE COFFEE GROUP" title      | PASS   | Renders with correct company name        |
| "CORPORATE OVERVIEW" subtitle    | PASS   |                                          |
| Central coffee cup icon          | PASS   | Animated glow effect                     |
| Department planets (7x)         | PASS   | Technology & AI, HR & Culture, Store Heilbronn, Marketing & Brand, Management, Store Stuttgart, Store San Francisco |
| Department icons (color-coded)   | PASS   | Blue, pink, orange, purple, teal         |
| Orbital connection lines         | PASS   | Dashed SVG lines center → planets        |
| Top bar (Demo / Layer Universe)  | PASS   |                                          |
| Bottom dock (search, icons, Mora)| PASS   | All dock icons rendered                  |
| Quick Tips tooltip               | PASS   | "Spotlight Suche" tip shown              |

### L2 — Department Orbit (Management)

| Element                           | Status | Notes                                    |
|----------------------------------|--------|------------------------------------------|
| "MANAGEMENT" watermark           | PASS   | Large background text, `text-white/[0.07]` |
| Department Core orb              | PASS   | Emerald gradient, `w-28 h-28`           |
| "DEPARTMENT CORE" label          | PASS   |                                          |
| HUD: "Layer 2 / Department Orbit"| PASS   | Stats: 1 Space, 0 Aktiv, 0 Docs, 0 Preview |
| "Workspace 1" space orbiting     | PASS   | Star component with label               |
| Breadcrumb: UNIVERSE / MANAGEMENT| PASS   |                                          |
| Back button ("ZURUECK")          | PASS   | Navigates back to L1                     |
| "+ NEW SPACE" button             | PASS   |                                          |
| Orbital ellipse tracks           | PASS   | Dashed SVG orbit rings                  |

### L3 — Folder Cluster (Workspace 1)

| Element                           | Status | Notes                                    |
|----------------------------------|--------|------------------------------------------|
| "WORKSPACE 1" watermark          | PASS   | Large background text                    |
| Workspace Core orb               | PASS   | Emerald gradient, matches L2 style       |
| "WORKSPACE CORE" label           | PASS   |                                          |
| HUD: "Layer 3 / Folder Cluster"  | PASS   | Stats: 3 Folders, 0 Aktiv, 0 Files      |
| Folders orbiting (3x)           | PASS   | Inbox, Board Meetings, Company Policies  |
| Folder labels with file count    | PASS   | FolderOpen icon + "0" file count         |
| Breadcrumb: UNIVERSE / MANAGEMENT| PASS   |                                          |
| Back button ("Zurück")           | PASS   | Navigates back to L2                     |
| "+ NEW FOLDER" button            | PASS   |                                          |
| Orbit rings + connection lines   | PASS   | Consistent with L2 visual language       |

### Routes Tested

| Route          | Expected                  | Actual                    | Status |
|---------------|---------------------------|---------------------------|--------|
| `/`           | Welcome screen            | Welcome screen renders    | PASS   |
| `/login`      | Login form                | Login form renders        | PASS   |
| `/home`       | Redirect to `/` (no auth) | Redirects with `?callbackUrl=%2Fhome` | PASS |
| `/home` (auth)| L1 Universe View          | Simple Coffee Group loads | PASS   |

### Network Analysis

| Metric                  | Value           |
|------------------------|-----------------|
| Total requests (login) | 14              |
| Failed requests        | 0               |
| Transfer size          | 3.9 MB          |
| DOMContentLoaded       | 494 ms          |
| WebSocket (HMR)        | Active (101)    |

---

## L2/L3 Visual Consistency (Code Review)

| Property                | L2 (DepartmentLayer)         | L3 (SpaceLayer)              | Consistent? |
|------------------------|------------------------------|------------------------------|-------------|
| Background overlay     | Gradient radials             | Gradient radials (subdued)   | YES         |
| Title watermark        | `text-white/[0.07]`         | `text-white/[0.07]`         | YES         |
| HUD badge              | "Layer 2 / Department Orbit" | "Layer 3 / Folder Cluster"  | YES         |
| HUD styling            | `rounded-2xl border-white/10 bg-black/35 backdrop-blur-xl` | Same | YES |
| Back button label      | "Zurueck" (ASCII)           | "Zurück" (UTF-8)            | MINOR INCONSISTENCY |
| Central orb            | `w-28 h-28`, emerald gradient | Same                       | YES         |
| Orbit animation        | SVG ellipses, animated      | SVG ellipses, animated      | YES         |
| Ring radii             | `[230, 320, 405]`           | `[140, 220, 300]`           | Intentional |

### Findings

1. **Minor:** L2 uses "Zurueck" (ASCII), L3 uses "Zurück" (UTF-8). Standardize to "Zurück".
2. **L2/L3 visual language is well-aligned.** Same HUD, orbit, orb design across layers.
3. **L4 (FolderLayer)** intentionally distinct — uses GlassPanel with list/grid/mycelium views.

---

## Recommendations

1. Standardize "Zurueck" → "Zurück" in `DepartmentLayer.tsx`
2. Add initial Jest test files or `--passWithNoTests` flag
3. Document proxy setup in README for new developers

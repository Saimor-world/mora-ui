# CLAUDE FRONTEND PLAN — 2026-03-01
## Visual Coherence + L4 + AI Integration

**Status:** Laufend — arbeite parallel zu Codex
**Branch:** `main` auf `mora-ui`

---

## Bereits erledigt (commits c4874cc → c0e0c20)

- [x] Star.tsx: Sphere-Opacity 25% → 80%, SVG Capacity+Activity Ringe, Halo boost
- [x] Folder.tsx: Sphere-Opacity 22% → 73%, SVG Ringe, Halo boost
- [x] SpaceLayer.tsx: Center-Orb 9% → 67%, Background weniger dunkel, RING_RADII fix
- [x] DepartmentLayer.tsx: displaySpaceName "Workspace 1" Bug fix
- [x] saimor-ops deploy.sh: Default UI_BRANCH main statt phaseAB

---

## Sprint 1 — Color Coherence (JETZT, sofort)

### 1A: DepartmentLayer Background — Dept-Farbe nutzen

**Problem:** L2 Background hat hardcoded blaue/grüne Radials — unabhängig von der Dept-Farbe.
HR & Culture zeigt trotzdem den gleichen "space-blauen" Hintergrund wie Management.

**Fix:** `getDeptStyle(deptTitle, deptColor)` importieren und den Hauptradial mit `style.glow` einfärben.

```tsx
// statt: rgba(15,125,183,0.42) hardcoded
// neu:   ${style.glow}40 — dept-farbiger Nebula
const style = getDeptStyle(deptTitle, deptColor || undefined);
background: `
  radial-gradient(1400px 720px at 54% 56%, ${style.glow}40 0%, transparent 66%),
  radial-gradient(1050px 540px at 18% 25%, ${style.glow}28 0%, transparent 62%),
  ...`
```

### 1B: SpaceLayer Background — Folder-Farben für Micro-Nebula

**Problem:** SpaceLayer hat eigene FALLBACK_COLORS statt ORBIT_PALETTE aus deptStyle.ts.
**Fix:** `import { ORBIT_PALETTE } from '@/lib/utils/deptStyle'` und FALLBACK_COLORS ersetzen.

### 1C: FolderLayer — Folder-Color-Akzente auf Node-Karten

**Problem:** Node-Karten im FolderLayer sind weiß/grau ohne Farbbezug zum Folder.
**Fix:** `currentFolder?.color` als Akzentfarbe für die Karten-Border + Icon-Tint.

---

## Sprint 2 — L4 Visual Upgrade (nach Codex B4 Seed)

### 2A: FolderLayer Orbital View (Optional)

Ein neuer View-Mode "orbital" neben list/grid:
- Nodes als kleine Partikel im Orbit um den Folder-Orb
- Klick auf Partikel → öffnet NodeDetailPanel
- Ähnliches visuelles Schema wie L3 Folders → L4 Nodes

### 2B: FolderLayer Header

Aktuell: kein visueller Header der zeigt WO man ist.
Fix: Breadcrumb + Folder-Orb-Miniatur + Farb-Accent-Header

---

## Sprint 3 — Mora AI Integration (nach Codex D2/D3)

### 3A: AI Orb → Chat Panel

Der Mora-Orb (rechts unten) ist bereits da. Beim Klick:
→ Slide-in Chat Panel mit Gemini/Claude Streaming

### 3B: Kontextuelles AI

Wenn du in L3 (SpaceLayer) bist:
→ Mora kennt den Kontext (department + space + folders)
→ Vorschläge: "Du hast 5 Ordner ohne Inhalt — soll ich dir helfen, Struktur aufzubauen?"

### 3C: Search → Semantic

Dock-Suchfeld: `GET /v1/search?q=...`
→ Ergebnisse als floating Cards im aktuellen Layer

---

## Prioritäten-Reihenfolge

1. **Jetzt:** Sprint 1A (DepartmentLayer color) + 1C (FolderLayer accents) → commit
2. **Wenn Codex B-Block fertig:** Sprint 1B + Verifikation aller Layer
3. **Wenn Codex D-Block fertig:** Sprint 3A (AI Chat Panel)
4. **Woche 2:** Sprint 2A (L4 Orbital View) + 3B (contextual AI)

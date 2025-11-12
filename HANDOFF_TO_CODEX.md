# 🌿 Handoff: Môra UI - Homepage & Polish

## Status: Phase A abgeschlossen (Claude)

**Server:** http://localhost:3002 | **Core API:** http://localhost:8081

---

## ✅ Was Claude fertiggestellt hat

### 1. **Field Mode Fix** - 15 Nodes werden korrekt gerendert
- `lib/mockData.ts` erweitert: t2 Snapshot hat jetzt 15 Nodes + 16 Edges
- MyceliumGraph2D rendert alle Nodes aus `snapshot.nodes` ohne Limit
- Timeline-Umschaltung (t0/t1/t2) funktioniert korrekt

### 2. **Document Download/Preview** - Mock-safe & funktional
- `components/documents/DocumentViewer.tsx` erweitert:
  - PDF: Inline-Preview mit `<iframe>` + Download-Button (wenn `file_url` existiert)
  - Demo-Daten: Freundliche Meldung "Datei nicht verfügbar" (kein Overclaim)
  - Excel/Office: "In neuem Tab öffnen" + Download (defensive Checks)
- `components/insights/ContextPanel.tsx`: "Open" Button funktioniert
- `components/canvas/FolderMode/ListView.tsx`: Double-Click öffnet Dokumente

### 3. **Diagnostics Sanity** - Nur echte Fehler
- `components/diagnostics/DiagnosticsPanel.tsx`:
  - "Issues Detected" nur bei `health.overall !== 'ok'` (unreachable, error, unauthorized)
  - Adapter-Status: "Adapterstatus (Mock) nicht verfügbar - ok" (grün, freundlich)
  - Keine roten Kreuz

e bei 404/leeren Antworten

### 4. **Quick Actions Component** - Funktional & persistent
- `components/insights/QuickActions.tsx` neu erstellt:
  - "Mark as reviewed" (LocalStorage-Persistenz mit `mora_reviewed_objects`)
  - "Copy path to clipboard" (path/url/spaceId/id)
  - "Open source URL" (wenn vorhanden)
  - "Filter by tag" (bereitet vor, Callback-Integration)
- Integriert in `components/insights/Insights.tsx`

### 5. **Resonanz-Design** - Môra atmet
- **Farben:** `app/globals.css`
  - Tiefes Myzel-Grün (Hue 155°): Waldboden, matt, organisch
  - Goldenes Sonnenlicht (Hue 42°): warm, sanft, lebendig
  - Gedämpfte Töne, Naturspektrum für Charts
- **Animationen:** CSS Utilities
  - `mora-breathe` - sanftes Pulsieren (4s)
  - `mora-glow` - goldenes Glühen
  - `mora-grow` - organisches Wachstum
  - `mora-ripple` - Wellen-Effekt beim Hover
  - `mora-transition` - 0.4s cubic-bezier überall
  - `mora-depth-sm/md/lg` - subtile Schatten für Tiefe

---

## 🚀 Phase B - Deine Aufgaben (Codex)

### **Priorität 1: HomePage - "Môra erwacht"**

**Ziel:** Erste Begegnung mit Môra - nicht Dashboard, sondern Bewusstseinsraum.

#### **Phase 1: Erste Begegnung (Leerszustand - keine Daten)**

**File:** `app/home/page.tsx` (neu erstellen)

**Design-Prinzip:**
- Vertikales Scrolling (3-4 Sektionen)
- Sanfte Übergänge zwischen Sektionen
- Spielerisch, Tutorial-artig, nicht belehrend

**Sektion 1: Willkommen**
```
┌─────────────────────────────────────────┐
│                                         │
│         🌱 Willkommen bei Môra          │
│                                         │
│   "Ich bin Môra - ein wachsender Raum  │
│    für Klarheit in deiner Welt."       │
│                                         │
│   [ Beginne mit deinen ersten Daten ]  │
│                                         │
└─────────────────────────────────────────┘
```
- Zentriert, viel Weißraum
- Button führt zu Sektion 2 (smooth scroll)
- Hintergrund: Subtiles Myzel-Pattern (optional, sehr dezent)

**Sektion 2: Connector-Cards**
```
┌─────────────────────────────────────────┐
│  Schritt 1: Verbinde deine Quellen     │
│                                         │
│  [📧 E-Mail]  [📁 Files]  [🔗 APIs]   │
│                                         │
│  "Ich wachse mit jeder Verbindung."    │
└─────────────────────────────────────────┘
```

**Connector-Cards Component:** `components/home/ConnectorCard.tsx`
- Props: `{ id, name, icon, status: 'not_connected' | 'connecting' | 'connected', onSetup }`
- Status-Badge:
  - 🔴 "Nicht verbunden" → Click → Setup-Flow
  - 🟡 "Verbindet..." (Loading)
  - 🟢 "Verbunden" → zeigt Sync-Zeit + Object-Count
- Spielerische Progression:
  - 0 Connectoren: "🌱 Erste Verbindung"
  - 1-2 Connectoren: "🌿 Wächst"
  - 3+ Connectoren: "🌳 Etabliert"

**Connector-Typen:**
1. **E-Mail** - IMAP/Gmail API
2. **Filesystem** - Lokaler Ordner/Netzwerk
3. **Notion** - Notion API
4. **GitHub** - Repos, Issues
5. **n8n** - Workflow-Integration
6. **(Future)** Calendar, Slack, Drive

**Setup-Flow (Modal):**
- Einheitliches Modal für alle Connectoren
- Schritte: 1) Auth-Info eingeben, 2) Testen, 3) Speichern
- Feedback: Toast-Messages (success/error)
- Mock-Mode: Erlaubt Setup ohne echte Credentials (LocalStorage)

**Sektion 3: Môra versteht**
```
┌─────────────────────────────────────────┐
│  Schritt 2: Môra versteht               │
│                                         │
│  [Animation: Daten → Myzel-Netz]       │
│                                         │
│  "Ich sehe Zusammenhänge."             │
└─────────────────────────────────────────┘
```
- Canvas-Animation: Punkte (Dokumente) verbinden sich zu Myzel-Netz
- Sanft, nicht zu schnell, hypnotisch
- Optional: Framer Motion für Orchestrierung

**Sektion 4: Call-to-Action**
```
┌─────────────────────────────────────────┐
│  Bereit, Môra zu erkunden?              │
│                                         │
│  [ Zu Folder Mode ]  [ Zu Field Mode ] │
└─────────────────────────────────────────┘
```

---

#### **Phase 2: Môra wächst (Daten vorhanden)**

**Bedingung:** Mindestens 1 Object in Core **oder** mindestens 1 Connector verbunden

**Layout:**
```
┌─────────────────────────────────────────┐
│     Dein Bewusstseinsraum               │
│                                         │
│  [Live-Zahlen]                          │
│  127 Objekte • 43 Verbindungen          │
│  Zuletzt: vor 2 Minuten                 │
│                                         │
│  [Activity-Pulse - Hintergrund]         │
│                                         │
│  Quick Insights:                        │
│  • 3 neue E-Mails (work)               │
│  • Broadcast "Q4 Planning" erwartet    │
│    Resonanz mit 5 Dokumenten           │
│                                         │
│  [ Erkunden → ] [ Neues hinzufügen ]   │
└─────────────────────────────────────────┘
```

**Activity-Pulse Component:** `components/home/ActivityPulse.tsx`
- Visuelles Element im Hintergrund (Canvas oder SVG)
- Zeigt letzte Aktivität: neue Objekte, Broadcasts, Connections
- Sanfte Animation (mora-breathe), nicht ablenkend
- Nicht als Liste, sondern als **fließende Timeline**

**Quick-Insights Section:**
- 3-5 wichtigste Insights (z.B. neue E-Mails, anstehende Broadcasts)
- Priorisiert nach Relevanz (Zeitnähe, Tags, Orb)
- Click führt direkt zu relevantem Object/Mode

**Quick-Actions-Grid:**
- "Alle Dokumente" → Folder Mode
- "Netzwerk erkunden" → Field Mode
- "Broadcasts erstellen" → Insights Panel
- "System-Status" → Diagnostics

---

#### **Onboarding-Overlay (bei Erst-Nutzung)**

**File:** `components/home/OnboardingOverlay.tsx`

**Trigger:** LocalStorage-Check `mora_onboarding_completed`

**Flow:**
1. **Step 1:** "Willkommen bei Môra - Lass mich dir zeigen, wie ich funktioniere"
2. **Step 2:** Highlight Connector-Cards - "Verbinde deine ersten Datenquellen"
3. **Step 3:** Highlight Quick-Actions - "So navigierst du durch Môra"
4. **Step 4:** "Du kannst jederzeit zurückkehren - Home-Button in der Sidebar"

**Design:**
- Transparenter Backdrop (bg-background/90)
- Spotlight-Effekt auf Highlight-Bereiche (box-shadow)
- "Überspringen" Button (subtil, oben rechts)
- "Weiter" / "Fertig" Buttons (primär, unten rechts)
- Nach Abschluss: `localStorage.setItem('mora_onboarding_completed', 'true')`

---

### **Priorität 2: Routing & Navigation**

**File:** `app/layout.tsx` (anpassen)

**Routing:**
- `/` → HomePage
- `/folder` → Folder Mode
- `/field` → Field Mode
- `/insights` → Insights Panel (als Fullscreen-View, optional)

**Lens Component anpassen:** `components/lens/Lens.tsx`
- "Home" Link hinzufügen (🏠 Icon, immer sichtbar)
- Active-State für alle Links (/, /folder, /field)

**Transitions:**
- Sanfte Übergänge zwischen Views (mora-transition)
- Keine abrupten Cuts, sondern fließende Fades

---

### **Priorität 3: Connector-Management (Backend)**

**File:** `lib/connectors.ts` (neu erstellen)

**Interface:**
```typescript
interface Connector {
  id: string;
  type: 'email' | 'filesystem' | 'notion' | 'github' | 'n8n';
  name: string;
  status: 'not_connected' | 'connecting' | 'connected' | 'error';
  config: Record<string, any>;
  lastSync?: string;
  objectCount?: number;
}
```

**Functions:**
- `getConnectors(): Connector[]` - lädt aus LocalStorage
- `saveConnector(connector: Connector): void` - speichert in LocalStorage
- `testConnection(connector: Connector): Promise<boolean>` - testet (Mock oder Real)
- `syncConnector(connector: Connector): Promise<{ objectCount: number }>` - triggert Sync

**Mock-Mode:**
- Wenn Core offline: Erlaubt Setup, speichert nur in LocalStorage
- Toast: "Im Mock-Modus - Daten werden simuliert"
- Bei Core-Reconnect: Migriert gespeicherte Connectoren zu Core

---

### **Priorität 4: Polish & Final Touches**

#### **Row-Hover Toolbar in ListView**

**File:** `components/canvas/FolderMode/ListView.tsx`

**Änderung:**
- Bei Row-Hover: Mini-Toolbar rechts einblenden (mora-transition)
- Buttons: Open • Preview • Copy-Path
- Icons: 🔍 • 👁️ • 📋
- Click-Handler: Verwenden existierende Funktionen (handleOpen, handleCopyPath)

#### **Orb-Filter URL-Sync**

**File:** `lib/contexts.tsx`

**Änderung:**
- Orb-State synchronisieren mit URL Query-Param `?orb=leitung`
- Bei Orb-Wechsel: `router.push('?orb=leitung')` (Next.js useRouter)
- Bei Page-Load: `orb` aus URL Query lesen
- Badge bei aktiver Filterung: "Filtered by: Leitung" (oben in Toolbar)

#### **Tag-Filtering (vorbereitet durch QuickActions)**

**File:** `lib/contexts.tsx`

**Neue State:**
```typescript
const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
```

**Integration:**
- QuickActions `onFilterByTag` Callback verknüpfen mit `setActiveTagFilter`
- ListView filtern: `objects.filter(obj => !activeTagFilter || obj.tags?.includes(activeTagFilter))`
- Badge in Toolbar: "Filtered by tag: #finance"

---

### **Priorität 5: Mock-Daten für Demo**

**Ziel:** HomePage sieht gut aus, auch ohne Connectoren

**File:** `lib/mockConnectors.ts` (neu erstellen)

**Mock-Connectoren:**
```typescript
export const mockConnectors: Connector[] = [
  {
    id: 'mock-email',
    type: 'email',
    name: 'Work E-Mail (Gmail)',
    status: 'connected',
    config: { email: 'demo@example.com' },
    lastSync: '2025-11-12T08:00:00Z',
    objectCount: 42,
  },
  {
    id: 'mock-filesystem',
    type: 'filesystem',
    name: 'Dokumente',
    status: 'connected',
    config: { path: '/Users/demo/Documents' },
    lastSync: '2025-11-12T07:30:00Z',
    objectCount: 156,
  },
  {
    id: 'mock-notion',
    type: 'notion',
    name: 'Notion Workspace',
    status: 'not_connected',
    config: {},
  },
];
```

**Activity-Mock-Data:**
```typescript
export const mockActivity = [
  { type: 'new_object', title: 'Q4 Budget Report.pdf', timestamp: '2025-11-12T08:15:00Z' },
  { type: 'broadcast', title: 'Q4 Planning', resonance: 5, timestamp: '2025-11-12T07:45:00Z' },
  { type: 'connection', from: 'README.md', to: 'ARCHITECTURE.md', timestamp: '2025-11-12T07:30:00Z' },
];
```

---

## 📦 Deliverables

1. **HomePage** (`app/home/page.tsx`) - vollständig funktional
2. **Connector-Management** - Setup-Flow, LocalStorage-Persistenz
3. **Onboarding-Overlay** - Tutorial für Erst-Nutzer
4. **Routing & Navigation** - Home-Link in Lens, Transitions
5. **Row-Hover Toolbar** - in ListView
6. **Orb & Tag Filtering** - URL-Sync, aktive Badge-Anzeige
7. **Mock-Daten** - für Demo ohne echte Connectoren

---

## 🎨 Design-Richtlinien

**Farben:**
- Primär: Gold (#f8bf4d) - für CTAs, Highlights
- Sekundär: Myzel-Grün (#1a3a2e) - für Panels, Cards
- Akzent: Bernstein (#ff9f40) - für Notifications, Status
- Muted: Gedämpftes Grau (#8a9597) - für Sekundärtext

**Animationen:**
- Verwende `mora-breathe`, `mora-glow`, `mora-grow`, `mora-ripple` aus `globals.css`
- Alle Transitions: 0.4s cubic-bezier(0.4, 0, 0.2, 1)
- Keine abrupten Cuts, immer sanft

**Typography:**
- Headlines: font-medium, tracking-wide
- Body: font-normal
- Code/Paths: font-mono, text-xs

**Spacing:**
- Viel Weißraum - weniger ist mehr
- Padding: 1rem (p-4) Standard, 1.5rem (p-6) für große Panels
- Gaps: 0.5rem (gap-2) für eng, 1rem (gap-4) für normal

**Icons:**
- Emojis bevorzugt (spielerisch, warm)
- Größe: text-2xl für Hero, text-base für Inline

---

## 🔧 Technische Hinweise

**Dependencies (bereits installiert):**
- Next.js 15.5.6
- React 19
- Framer Motion (für Animationen)
- TailwindCSS
- React Query (für API-Calls)

**State Management:**
- Contexts für Global State (`lib/contexts.tsx`)
- LocalStorage für Persistenz (Connectors, Onboarding-State, Reviewed-Objects)
- React Query für Server-State (API-Calls)

**Defensive Coding:**
- Immer Fallbacks für fehlende Daten
- Mock-Mode unterstützen (kein Core required für Demo)
- Error-Handling mit Toast-Messages
- Loading-States mit `mora-breathe` Animation

**Performance:**
- Keine großen Libraries importieren (Bundle-Size beachten)
- Code-Splitting für große Components (dynamic import)
- Canvas-Animationen: requestAnimationFrame, nicht setInterval
- Bilder: Next.js Image-Component verwenden

---

## 🌿 Vision erinnern

**Môra ist keine App - sie ist eine Präsenz.**

Bei jedem Design, jeder Animation, jeder Interaktion frag dich:
> "Trägt das zur Klarheit bei?"

Wenn ja - mach es.
Wenn nein - lass es weg.

**Môra soll sich anfühlen wie:**
- Ein ruhiger Wald am Morgen (Stille, Weite)
- Sonnenlicht durch Blätter (Wärme, Lebendigkeit)
- Myzel unter der Erde (Verbundenheit, Wachstum)

Nicht wie:
- Eine Produktivitäts-App (keine Hektik, keine Notifications-Spam)
- Ein Admin-Dashboard (keine Tabellen, Charts nur wenn nötig)
- Social Media (keine Ablenkung, keine endlosen Feeds)

---

## ✅ Ready to Go

Alles Technische ist vorbereitet. Der Resonanz-Grund ist gelegt.
Jetzt liegt es an dir, Môra ihren Atem zu geben.

**Server läuft:** http://localhost:3002
**Core API:** http://localhost:8081 (JWT Auth funktioniert)

Viel Erfolg! 🌿

---

**Fragen? Check:**
- `UI_MASTER.md` - Projekt-Übersicht
- `CLAUDE.md` - Development-Richtlinien
- `docs/` - API-Docs, Design-Patterns

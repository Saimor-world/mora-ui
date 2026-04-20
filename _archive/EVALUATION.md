# SAIMOR OS — Frontend Evaluation

**Date:** 2026-02-26
**Version:** v1.5.0-beta @ `32aa130`
**Tester:** Cursor Cloud Agent (Frontend)
**Data Source:** `api.saimor.world` (Production, tenant-demo)

---

## 1. Daten-Problem: Warum zeigt es keine Daten an?

### Root Cause: Zwei Backend-Bugs

**Bug 1: `node_count` ist immer 0 auf allen Folders**

Die API liefert `node_count: 0` für alle 25 Folders — obwohl **62 Nodes** tatsächlich existieren und korrekt einer `folder_id` zugeordnet sind. Beispiel:

```
GET /v1/folders → "Board Meetings": node_count: 0
Aber: 3 Nodes haben folder_id = b0fbf4c5... (Budget Approval, Meeting Minutes, ...)
```

**Impact:** L3 Folder Cluster zeigt überall "📁 0" an. User denkt, alle Folders sind leer.

**Bug 2: `folder_id`-Filter funktioniert nicht**

```
GET /v1/nodes?folder_id=b0fbf4c5-2173-... → gibt ALLE 62 Nodes zurück (ungefilterT!)
```

Egal welche `folder_id` man schickt, man bekommt immer alle Nodes. Das heißt:
- L4 Folder-View würde alle 62 Nodes in **jedem** Folder anzeigen statt nur die zugehörigen
- Die Suche innerhalb von Folders funktioniert nicht korrekt

**Empfehlung für Backend-Agent:**
1. `folder_id`-Filter im `/v1/nodes`-Endpoint implementieren (SQL WHERE clause)
2. `node_count` auf Folders korrekt berechnen (entweder als computed field oder als trigger-based counter)
3. Optional: `/v1/departments/stats` Endpoint fixen (gibt "Department not found" zurück)

### Was funktioniert trotzdem

- **Notes App**: Zeigt 3 Notizen korrekt an (nutzt `type=note` Filter statt `folder_id`)
- **Mora Chat**: Kennt die Struktur und kann Departments auflisten (nutzt eigene Cognition-API)
- **MORA NEXUS Stats**: Zeigt korrekte Metriken (14 Interactions, 3 Chats, 98% Accuracy)

---

## 2. Visuelle Evaluation

### Was gut ist

| Aspekt | Bewertung | Kommentar |
|--------|-----------|-----------|
| **Gesamtästhetik** | ⭐⭐⭐⭐⭐ | Professionelles dunkles Design mit Emerald/Cyan-Akzenten. Sehr kohärent. |
| **L1 Universe View** | ⭐⭐⭐⭐⭐ | Beeindruckende Orbital-Darstellung. Coffee-Cup-Center, farbcodierte Planets. |
| **L2→L3 Transitions** | ⭐⭐⭐⭐ | Cinematic Zoom-Effekt mit Blur. Fühlt sich wie "Eintauchen" an. |
| **Glassmorphism Panes** | ⭐⭐⭐⭐ | Backdrop-blur, subtile Borders. Konsistent über alle Panes. |
| **Mora Chat UI** | ⭐⭐⭐⭐ | Saubere Chat-Bubble-Darstellung, Suggested-Prompts, Timestamps. |
| **Spotlight Search** | ⭐⭐⭐⭐⭐ | Sofort verfügbar, übersichtlich, zeigt System-Actions. |
| **Bottom Dock** | ⭐⭐⭐⭐ | Tooltips, Shortcuts, gute Icon-Auswahl. OS-artiges Feeling. |

### Was verbessert werden kann

| Problem | Schwere | Beschreibung | Empfehlung |
|---------|---------|-------------|------------|
| **"Zurueck" vs "Zurück"** | Minor | L2 nutzt ASCII "Zurueck", L3 nutzt UTF-8 "Zurück" | Standardisieren auf "Zurück" in `DepartmentLayer.tsx` |
| **L3 Folders zeigen "📁 0"** | Major | Obwohl Nodes existieren, zeigt die UI überall 0 Files an (Backend-Bug s.o.) | Backend: `node_count` korrekt berechnen |
| **Empty State zu häufig** | Medium | "NO FOLDERS YET" / "NO SPACES FOUND" erscheint oft, weil Daten-Endpoints inkorrekt filtern | Backend-Fixes + Frontend-Fallback wenn `node_count=0` aber Nodes über alternatives Loading |
| **L2 Orbit zu leer** | Medium | Departments wie Technology & AI haben nur 1 Space, der allein orbitet. Sieht verloren aus. | Mindest-Orbit-Radius verkleinern wenn nur 1 Space, oder zusätzliche Info anzeigen (z.B. Folder-Previews) |
| **Folder Labels überlappen** | Minor | Bei 3+ Folders in L3 können Labels/Orbits überlappen wenn sie sich nahe kommen | Collision detection oder Label-Offset-Logik |
| **Quick Tips versteckt Dock** | Minor | "TIPP 1/4" Tooltip unten links verdeckt teilweise den User-Avatar | Z-Index oder Position anpassen |
| **Star/Planet Größen** | Minor | Departments ohne viel Inhalt haben die gleiche Größe wie aktive | Größe proportional zu Space-/Node-Count skalieren |
| **MoraOrb nicht sichtbar** | Low | Im L1/L2/L3 View ist der Mora-Orb (3D/CSS) nicht prominent sichtbar | Dezenten Orb-Effekt in den Hintergrund oder neben dem MORA-Button |

---

## 3. Funktionale Evaluation

### Was voll funktioniert ✅

| Feature | Status | Details |
|---------|--------|---------|
| Login (NextAuth) | ✅ | demo/demo123, Session, JWT, Redirect |
| L1 Universe Navigation | ✅ | 7 Departments klickbar, Transitions |
| L2 Department Orbit | ✅ | Spaces orbiting, Stats-HUD, Back-Navigation |
| L3 Folder Cluster | ✅ | Folders orbiting, Labels, Orbit-Rings |
| Spotlight Search (Strg+K) | ✅ | System-Actions, schnell, übersichtlich |
| Mora Chat (LLM) | ✅ | Antwortet kontextbewusst, listet Departments |
| MORA NEXUS Overview | ✅ | Stats, Live Feed, Quick Actions |
| MORA NEXUS Stats | ✅ | 98% Accuracy, 1.2s Avg, 847 Interactions |
| MORA NEXUS Memory | ✅ | UI funktioniert, leer im Demo |
| Settings Pane | ✅ | Profil, Design, Mitteilungen, Workspace, Team, System |
| Finder App | ✅ | Grid/List, 7 Department-Ordner, Upload-Button |
| Notes App | ✅ | 3 Notizen mit Content-Preview, Search |
| Auth Middleware | ✅ | /home geschützt, Redirect zu Login |
| Pane System | ✅ | Floating, Minimize, Close, Overlapping |

### Was nicht funktioniert ❌

| Feature | Problem | Ursache |
|---------|---------|---------|
| L4 Folder Content | Zeigt alle 62 Nodes in jedem Folder | Backend: `folder_id` Filter broken |
| L3 File Counter | Immer "0 Files" | Backend: `node_count` nicht aktualisiert |
| Department Stats API | "Department not found" | Backend: Endpoint-Bug |
| WebGL 3D Rendering | Disabled (CSS Fallback) | `NEXT_PUBLIC_DISABLE_WEBGL=true` in Config |

### Was teilweise funktioniert ⚠️

| Feature | Status | Details |
|---------|--------|---------|
| Finder Deep Navigation | ⚠️ | Zeigt Departments, aber Drill-Down in Spaces/Folders ungetestet |
| Upload | ⚠️ | Button vorhanden, Funktion nicht getestet (schreibt gegen Prod) |
| Node-Erstellung | ⚠️ | UI vorhanden ("NEW NODE"), nicht getestet (Prod-Schreibschutz) |
| Space/Folder-Erstellung | ⚠️ | Buttons vorhanden, nicht getestet |
| Awareness Signals | ⚠️ | Live Feed zeigt Events, aber nur DATA_CHANGE Typ |

---

## 4. Sinnvolle nächste Schritte

### P0 — Kritisch (Daten sichtbar machen)

1. **Backend: `folder_id` Filter im `/v1/nodes` Endpoint fixen**
   - Ohne das zeigt L4 falsche Daten an
   - SQL: `WHERE folder_id = :folder_id` statt alle Nodes zurückgeben

2. **Backend: `node_count` auf Folders korrekt berechnen**
   - Option A: Computed field bei jedem `/v1/folders` Call (COUNT Subquery)
   - Option B: Trigger-based Counter der bei Node-CRUD aktualisiert wird
   - Impact: L3 zeigt korrekte File-Counts, Folder-Sterne werden richtig skaliert

3. **Backend: `/v1/departments/stats` Endpoint fixen**
   - Wird von `UniverseView` genutzt für Department-Metriken
   - Aktuell: "Department not found"

### P1 — Hoch (UX-Verbesserungen)

4. **L2 Single-Space-Optimierung**
   - Wenn ein Department nur 1 Space hat, den Orbit-Radius verkleinern oder Space prominent zentriert anzeigen
   - Aktuell wirkt 1 Space allein auf großem Orbit verloren

5. **L4 Folder-View standardmäßig öffnen bei Folder-Click**
   - Aktuell öffnen Folders in L3 manchmal ein Pane statt zu L4 zu navigieren
   - Klares Verhalten: Single-Click → L4 Navigation, Shift+Click → Pane

6. **"Zurück"-Label standardisieren**
   - `DepartmentLayer.tsx` Zeile 262: "Zurueck" → "Zurück"

### P2 — Medium (Feature Polish)

7. **Planet-Größen proportional zu Inhalt**
   - Departments mit mehr Spaces/Nodes bekommen größere Planeten
   - Gibt visuellen Hinweis auf "Aktivität" der Abteilung

8. **Folder-Previews in L2 bei Hover**
   - Beim Hovern über einen Space in L2 erscheinen bereits die Folder-Namen
   - Gibt dem User einen Vorgeschmack ohne zu navigieren (bereits teilweise implementiert)

9. **Mora Memory nutzen**
   - Chat-Gespräche in Memory speichern
   - "Merken"-Button bei Chat-Antworten → Memory-Tab füllen

10. **WebGL aktivieren für echte 3D-Erfahrung**
    - Aktuell ist `NEXT_PUBLIC_DISABLE_WEBGL=true` Standard
    - WebGL-Version mit Fallback auf CSS wenn nicht unterstützt

### P3 — Nice-to-Have

11. **Dark/Light Mode Toggle** (Settings → Design Tab existiert bereits)
12. **Keyboard Navigation** (Pfeiltasten für Department-Wechsel in L1)
13. **Animations-Geschwindigkeit** in Settings einstellbar
14. **Notification-System** (Glocken-Icon im Dock vorhanden, aber ohne Funktion)
15. **Team & Benutzer** Verwaltung (Settings-Tab existiert, nicht getestet)

---

## 5. Architektur-Bewertung

### Stärken

- **Zustand + Immer**: State Management ist sauber, navigieren zwischen Layern ist ein einziger `set()` Call
- **Next.js Proxy**: Saubere CORS-Lösung über Rewrites
- **NextAuth**: Produktions-reife Auth mit JWT Delegation zum Backend
- **Pane System**: Flexibles Window-Management wie ein echtes OS
- **Separation of Concerns**: API-Client (`coreClient.ts`), State (`moraState.ts`), und Components klar getrennt

### Schwächen

- **`node_count` Dependency**: Frontend verlässt sich auf Backend-seitige Counts die nicht stimmen
- **Kein Error Boundary pro Layer**: Ein Fehler in L2 crashed den ganzen ViewPort
- **Keine Offline-Fallback-Daten**: Ohne Backend zeigt die UI nichts (anders als alte MVP-Version)
- **Jest ohne Tests**: Testing-Framework eingerichtet aber 0 Testdateien
- **`ignoreBuildErrors: true`**: TypeScript-Fehler werden im Build ignoriert — potenzielle Runtime-Crashes

---

## 6. Zusammenfassung

| Kategorie | Note | Kommentar |
|-----------|------|-----------|
| **Visuelles Design** | A | Erstklassige Ästhetik, professionelles OS-Feeling |
| **UX/Navigation** | A- | Intuitive Layer-Navigation, Spotlight, Dock — nur kleine Ecken |
| **Datenintegrität** | C | Backend-Bugs verhindern korrekte Datenanzeige |
| **Mora AI/Chat** | A | LLM antwortet schnell und kontextbewusst |
| **Code-Qualität** | B+ | Saubere Architektur, aber fehlende Tests und `ignoreBuildErrors` |
| **Produktionsreife** | B- | UI ist reif, aber Daten-Layer hat Bugs |

**Fazit:** Das Frontend ist visuell und funktional auf einem sehr hohen Niveau. Der Hauptblocker für die User-Experience sind die Backend-Bugs (`node_count`, `folder_id` Filter), die dazu führen dass Folders leer erscheinen obwohl 62 Dokumente existieren. Nach Behebung dieser zwei Bugs würde die volle Datenstruktur sichtbar werden und das OS-Erlebnis komplett machen.

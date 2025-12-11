# 🧠 SAIMÔR SEMANTIC & INTELLIGENCE LAYER

**Version:** 1.0 (Consolidated)  
**Created:** 2025-12-10  
**Status:** Active Reference  
**Scope:** UI-seitige Semantik, Intelligence und Awareness

> **Consolidated from:** SEMANTIC_PIPELINE_V1.md, SEMANTIC_GRAPH_V2.md, SEMANTIC_SHELL_PREP.md, MINDLOOP_EVENT_MODEL.md, INTELLIGENCE_LAYER_V2.md, INTELLIGENCE_UI_OVERVIEW.md, AWARENESS_ENGINE_V1.md, AWARENESS_LOOP_V2.md

---

## 📋 ÜBERSICHT

Dieses Dokument konsolidiert alle UI-seitigen Konzepte für:
- **Semantic Pipeline** — Gewichtung und Darstellung von Nodes
- **Semantic Graph** — Visuelle Anordnung basierend auf Bedeutung
- **Intelligence Layer** — MindLoop und Event-basierte Awareness
- **Awareness System** — Orb-Zustände und UI-Reaktionen

---

## 1. SEMANTIC PIPELINE

### Evaluierungs-Logik
Die Pipeline bewertet die "Wichtigkeit" jedes Nodes für visuelle Hierarchien.

### 1.1 Recency Decay
Gilt für Folders und Nodes:
- **Formel:** `weight = max(0.2, 1.0 - (daysSinceUpdate / 30))`
- Items, die in den letzten 30 Tagen aktualisiert wurden, sind heller/größer

### 1.2 Type Weighting
Verschiedene Node-Typen haben unterschiedliche Basis-Gewichte:

| Typ | Gewicht | Beschreibung |
|-----|---------|--------------|
| Document | 1.0 | Höchste Priorität |
| Note | 0.8 | Wichtige Notizen |
| Task | 0.7 | Aktionsitems |
| Link | 0.5 | Referenzen |
| Other | 0.4 | Sonstiges |

### 1.3 Visual Mapping
- **Constellation:** High-Weight Items haben dickere Verbindungslinien
- **UI Grid:**
  - Weight > 0.8: **Insight Mode** (Amber Glow + Pulse)
  - Weight > 0.6: **Focus Mode** (Emerald Border)
  - Basis: **Standard** (White/Gray)

---

## 2. SEMANTIC GRAPH

### 2.1 Semantic Gravity
Statt chronologischer Listen werden Items nach Gewicht sortiert:
```javascript
nodes.sort((a, b) => b.weight - a.weight)
```

### 2.2 Positionierung
- **Spiral/Ring Distribution**
- **High Weight:** Innere Ringe / Zentrum (näher am Beobachter)
- **Low Weight:** Äußere Ringe (Peripherie)

### 2.3 Cluster Logic
- **Proximity:** Items mit ähnlichem Gewicht clustern natürlich
- **Type Similarity:** Durch Constellations visuell verknüpft

---

## 3. SEMANTIC LAYER ARCHITEKTUR

### 3.1 Layer Stack (Z-Order)

| Level | Content | Z-Index | Zweck |
|-------|---------|---------|-------|
| 0 (Bottom) | Background, Starfield, Nebulas | z-0 | Atmosphäre |
| 5 (Middle) | **Semantic Overlay** | z-5 | **Daten-Beziehungen** |
| 10 (Top) | Interaktiver Content | z-10 | User Interaction |
| 50 (Overlay) | HUD, Navigation | z-50 | Globale UI |

### 3.2 Anchor Point
```html
<div id="semantic-layer-anchor" 
     className="absolute inset-0 z-5 pointer-events-none overflow-visible" />
```

Präsent in: `DepartmentLayer`, `SpaceLayer`, `FolderLayer`

### 3.3 Coordinate Mapping
- **World Space:** Origin (0,0) = Top-left des Viewport Containers
- **Units:** Pixel (relativ zum Container)
- **Scaling:** Automatisch durch Parent-Transforms

### 3.4 Performance Constraints
1. `pointer-events-none` ist Pflicht
2. Opacity-Transitions erst NACH View-Transition
3. Semantic Layer muss sauber unmounten bei View-Wechsel

---

## 4. MINDLOOP EVENT MODEL

### 4.1 Event Struktur
```typescript
interface MindLoopEvent {
    id: string;
    type: 'USER_ACTION' | 'SYSTEM_ALERT' | 'DATA_CHANGE' | 'SEMANTIC_MATCH';
    source: string;
    timestamp: number;
    severity: number; // 0.0 - 1.0
    awarenessTrigger?: 'idle' | 'watch' | 'focus';
}
```

### 4.2 Verhaltens-Regeln (V1)
1. **High Activity:** >3 Nodes in 1 Min → Trigger Focus
2. **Critical Error:** Severity > 0.8 → Trigger Alert
3. **Insight:** Semantic Match > 0.9 → Trigger Gold Sparkle

---

## 5. INTELLIGENCE LAYER V2

### 5.1 Core Components

#### MindLoop Controller (`mindLoop.ts`)
- **Rolle:** Central Event Bus & State Machine
- **Mechanismus:** Akkumuliert Events, appliziert Decay, berechnet `AwarenessLevel`
- **States:** `Idle`, `Watch`, `Focus`, `Thinking`, `Alert`, `Insight`

#### Awareness Loop
- **Flow:** Event → MindLoop → State Change → UI Subscription → Visual Feedback
- **Components:** `MoraOrb` (Nucleus), `CursorAgent` (Extension), `UniverseLayers` (Context)

#### Semantic Graph
- **Enhancement:** Semantic Gravity & Sibling Similarity
- **Logic:** Nodes gewichtet nach Freshness, Type, Relation Strength

#### Constellation Engine
- **Visualization:** Dynamisches Zeichnen von Verbindungen
- **Behavior:** Connections pulsieren basierend auf `Insight` State

### 5.2 Integration Points
- `moraState.ts`: Dispatcht Events bei Data Load
- `CompanyCoreView.tsx`: Konsumiert Awareness State
- `MoraOrb.tsx`: Visualisiert System-Heartbeat

---

## 6. AWARENESS ENGINE

### 6.1 Granulare Awareness States
Der Orb existiert in 5 Zuständen:

| State | Trigger | Visual |
|-------|---------|--------|
| **Idle** | Default | Breathing Animation |
| **Watch** | Department View | Cyan Radar Ring |
| **Focus** | Space/Folder View | Emerald Ring |
| **Thinking** | API Calls | Blue Spinner |
| **Alert** | Error | Red Pulse |

### 6.2 Event-Driven Transitions
- **Navigation:** Department → `watch`, Deep Dive → `focus`
- **Data Loading:** API Calls → `thinking`
- **Errors:** System Faults → `alert`

### 6.3 Technical Implementation
- **Store:** `moraState.ts` managed `orbState`
- **Visuals:** `MoraOrb.tsx` mappt States zu Framer-Motion Definitionen

---

## 7. AWARENESS LOOP CYCLE

### 7.1 Der Zyklus

```
1. STIMULUS (Event)
   ├── User navigiert → Nav Event
   ├── Data lädt → Thinking Event
   ├── Fehler → Alert Event
   └── Pattern erkannt → Insight Event

2. PROCESSING (MindLoop)
   ├── Event geloggt mit Severity (0.0-1.0)
   ├── Decay appliziert auf alte Events
   └── State Evaluation:
       ├── Alert: System Alert > 0.6
       ├── Insight: Akkumulation > 5.0
       ├── Focus: Akkumulation > 2.0
       ├── Watch: Akkumulation > 0.5
       ├── Idle: Baseline
       └── Thinking: Override während async

3. PROPAGATION
   ├── MindLoopController notifiziert Subscribers
   └── useMoraStore updated orbState

4. REACTION (UI)
   ├── MoraOrb: Farbe, Pulse, Glow, Sparks
   ├── CursorAgent: Body Color, Trail
   └── Constellations: Animierte Verbindungen
```

### 7.2 Standard Triggers
- `loadDepartments` → `Thinking` → `Idle` (oder `Alert`)
- `loadSpaces` → `Watch`
- `loadNodes` → `Focus`

---

## 8. UI INTEGRATION

### 8.1 Context-Aware Highlighting
In `SpaceLayer`:
- **Amber Glow (Insight):** Folders mit recenter, heavy Activity
- **Emerald Border (Focus):** Active Working Directories

### 8.2 Scanning Radar
Bei Department-Navigation zeigt der Orb "Scanning Radar" (Cyan)

### 8.3 UX Philosophy
- **"Living Silence":** UI reagiert, aber schreit nicht
- **No Popups:** Insights sind embedded (glowing folders, nicht modals)

---

## 9. ZUKUNFT (Qdrant/Vectors)

### 9.1 Vector Data Injection
- **Source:** `semanticStore` / Qdrant API
- **Representation:** High-dimensional Vectors → 2D/3D (PCA/t-SNE/UMAP)
- **Rendering:**
  - Low Density (<100 links): Inline SVG
  - High Density (>100 links): Canvas oder WebGL

### 9.2 Interaction
- **Hover:** Node highlighting → Related edges leuchten
- **Click:** Edge → "Relationship Context" anzeigen

---

## 📚 REFERENZEN

### Dateien (UI)
- `lib/intelligence/mindLoop.ts` — MindLoop Controller
- `lib/stores/moraState.ts` — Awareness State Management
- `components/MoraOrb.tsx` — Orb Visualization
- `components/three/Mycelium25D.tsx` — Semantic Overlay

### Backend Integration
Siehe: `saimor-core/SEMANTIC_INTELLIGENCE.md`

---

*Erstellt: 2025-12-10 | Konsolidiert aus 8 Quelldateien*

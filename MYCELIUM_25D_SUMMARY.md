# MYCELIUM 2.5D - CALM MODE SUMMARY

**Stand:** 2025-11-27  
**Zweck:** Dokumentation der Optimierungen für 40–50 Node Visualisierung

---

## dYZ_ PROBLEM (Vorher)

Bei ~42 Nodes in einem Folder (z.B. „Architecture/Components“):
- ❌ **Hairball-Effekt:** Vollständiger Graph (alle Nodes mit allen verbunden)
- ❌ **Grüner Blob:** Zu viel Glow-Effekt überlagert sich
- ❌ **Unleserlich:** Labels überlagern sich, keine Struktur erkennbar
- ❌ **861 Verbindungen:** Bei 42 Nodes = 42·41/2 = 861 Linien

Root Cause:
- `myceliumDataMapper.ts` erstellte für „Same Folder“ einen vollständigen Graphen.
- Calm Mode konnte das nicht mehr kompensieren.

---

## ✅ LÖSUNG (Jetzt)

### 1. Sparse Folder Connections (myceliumDataMapper.ts)

**Vorher:**
```typescript
// Connect ALL nodes in same folder to each other
nodes.forEach((nodeA, i) => {
  nodes.slice(i + 1).forEach((nodeB) => {
    connect(nodeA, nodeB); // Complete graph!
  });
});
```

**Jetzt:**
```typescript
// Connect each node to its 2 nearest neighbors (sequential chain)
nodes.forEach((nodeA, i) => {
  const maxConnections = Math.min(2, nodes.length - i - 1);
  for (let j = 1; j <= maxConnections; j++) {
    const nodeB = nodes[i + j];
    connect(nodeA, nodeB); // Sparse chain!
  }
});
```

**Effekt:**
- Bei 42 Nodes: ~84 Verbindungen statt 861 (~90% Reduktion).
- Nodes bleiben verbunden (kein isolierter Graph).
- Struktur bleibt erkennbar (Ketten/Cluster).

### 2. Calm Connections & Focus Mode (Mycelium25D.tsx)

**Idle (Calm Mode, n > 25):**
```typescript
if (isCalmMode) {
  if (focusedNodeId || activeNodeId) {
    return conns.filter(conn => conn.isActive); // nur Fokus-Kanten
  }
  return []; // Idle: keine Verbindungen
}
```

**Hover/Fokus:**
- Nur Verbindungen, an denen der fokussierte/aktive Node beteiligt ist.
- Alle anderen Kanten bleiben ausgeblendet → kein Spaghetti-Effekt.

**Effekt:**
- Idle: Klarer Node-Teppich ohne Linien (ruhiges Feld).
- Hover: Lokales Mycelium rund um einen Node, leicht lesbar.

### 3. Reduced Glow & Firefly Labels (Mycelium25D.tsx)

**Glow (Nodes):**
```typescript
boxShadow: isCalmMode
  ? `0 0 ${isActive ? 6 : isFocused ? 3 : 0}px ${node.color}`
  : `0 0 ${isActive ? 8 : isFocused ? 5 : 2}px ${node.color}`;
```

**Labels (Firefly Mode):**
- n ≤ 20: Labels können dauerhaft sichtbar sein (Garden Mode).
- n > 20: Labels nur bei Hover/Fokus → keine 10+ überlappenden Labels.

**Effekt:**
- Kein „grüner Nebel“ durch globalen Glow.
- Labels bleiben lesbar, ohne die Bühne zu überladen.

---

## dY"S METRIKEN (42 Nodes)

| Metrik                            | Vorher | Jetzt              | Verbesserung     |
|-----------------------------------|--------|---------------------|------------------|
| **Verbindungen (Total)**         | 861    | ~84                | -90%             |
| **Verbindungen (Sichtbar Idle)** | 150    | 0                  | -100%            |
| **Verbindungen (bei Fokus)**     | 150    | lokal, nur Nachbarn| qualitativ besser|
| **Verbindungen pro Node (Fokus)**| ~20    | wenige, klar lesbare| stark reduziert  |
| **Glow-Intensität (Idle)**       | 8px    | 0–3px              | deutlich reduziert|
| **Calm Mode Threshold**          | 25     | 25                 | gleich           |

---

## dYZ" DESIGN-PRINZIPIEN (Beibehalten)

1. ✅ **Semantic First:** Shared Tags > Same Author > Same Type > Same Folder.
2. ✅ **Deterministic Layout:** Gleiche Daten = gleiche Visualisierung.
3. ✅ **Radial/Natural Constellation:** Cluster werden optisch getrennt, aber ruhig gehalten.
4. ✅ **Focus Mode:** Hover = Spotlight auf Node + Nachbarn.
5. ✅ **Firefly Mode:** Labels nur bei Hover (n > ~20).
6. ✅ **Calm Energy:** Idle = sanftes Atmen, kein Chaos.

---

## dY", VERBINDUNGS-HIERARCHIE

Die Verbindungen werden in dieser Priorität erstellt:

1. **Shared Tags** (stärkste semantische Verbindung)
   - Nodes mit gleichen Tags werden verbunden.
2. **Same Author** (mittlere Semantik)
   - Nodes vom gleichen Autor, begrenzt pro Node.
3. **Same Type + Shared Tags** (schwächere Semantik)
   - Nur bei Documents mit gemeinsamen Tags.
4. **Same Folder** (strukturell, schwächste)
   - Nur sequenzielle Kette (Node i → Node i+1, i+2), kein Full-Mesh.

**Wichtig:** Shared Tags überschreibt die schwächeren Regeln.

---

## dY� TEST-SZENARIEN

### Szenario 1: 42 Nodes, viele Shared Tags
- Erwartung: Dichte semantische Cluster, wenig Folder-Rauschen.
- Idle: Keine Linien, klarer Node-Teppich.
- Hover: Lokale Cluster-Verbindungen um den aktiven Node.

### Szenario 2: 42 Nodes, wenig Tags
- Erwartung: Sequenzielle Ketten, lockere Struktur.
- Verbindungen: dünnes Netz, nur bei Fokus sichtbar.

### Szenario 3: 10 Nodes (Normal Mode)
- Erwartung: Alle Verbindungen sichtbar, kein Calm Mode.
- Labels: sichtbar, aber nicht überladen.

---

## dY"? DATEIEN GEÄNDERT

- `mora-ui/lib/utils/myceliumDataMapper.ts`
- `mora-ui/components/organic/Mycelium25D.tsx`

---

**Fazit:** Das Mycelium ist jetzt calm, lesbar und semantisch sinnvoll bei 40–50 Nodes. dYO�


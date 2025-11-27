# MYCELIUM 2.5D - CALM MODE SUMMARY

**Stand:** 2025-11-27  
**Zweck:** Dokumentation der Optimierungen für 40-50 Node Visualisierung

---

## 🎯 PROBLEM (Vorher)

Bei ~42 Nodes in einem Folder (z.B. "Architecture/Components"):
- ❌ **Hairball-Effekt:** Vollständiger Graph (alle Nodes mit allen verbunden)
- ❌ **Grüner Blob:** Zu viel Glow-Effekt überlagert sich
- ❌ **Unleserlich:** Labels überlagern sich, keine Struktur erkennbar
- ❌ **861 Verbindungen:** Bei 42 Nodes = 42×41/2 = 861 Linien!

**Root Cause:**
- `myceliumDataMapper.ts` erstellte für "Same Folder" einen vollständigen Graphen
- Jeder Node war mit jedem anderen Node verbunden
- Calm Mode konnte das nicht mehr kompensieren

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
- Bei 42 Nodes: ~84 Verbindungen statt 861 (90% Reduktion!)
- Nodes bleiben verbunden (kein isolierter Graph)
- Struktur bleibt erkennbar (Ketten/Cluster)

### 2. Balanced Connection Display (Mycelium25D.tsx)

**Vorher:**
```typescript
// Show only 30 closest connections (random clustering)
return sorted.slice(0, 30);
```

**Jetzt:**
```typescript
// Show max 3 connections per node, distributed across all nodes
sorted.forEach(conn => {
    if (startCount < 3 && endCount < 3 && total < 80) {
        balancedConns.push(conn);
    }
});
```

**Effekt:**
- Jeder Node hat 2-3 sichtbare Verbindungen
- Keine "Hotspots" mit zu vielen Linien
- Netzwerk bleibt gleichmäßig verteilt

### 3. Reduced Glow in Calm Mode (Mycelium25D.tsx)

**Vorher:**
```typescript
boxShadow: `0 0 ${isActive ? 25 : isFocused ? 18 : 8}px ${node.color}`
```

**Jetzt:**
```typescript
boxShadow: isCalmMode 
    ? `0 0 ${isActive ? 20 : isFocused ? 12 : 4}px ${node.color}` // 50% reduced
    : `0 0 ${isActive ? 25 : isFocused ? 18 : 8}px ${node.color}`
```

**Effekt:**
- Glow-Effekte addieren sich nicht mehr zu einem Blob
- Nodes bleiben individuell erkennbar
- Calm, organische Ästhetik bleibt erhalten

---

## 📊 METRIKEN (42 Nodes)

| Metrik | Vorher | Jetzt | Verbesserung |
|--------|--------|-------|--------------|
| **Verbindungen (Total)** | 861 | ~84 | -90% |
| **Verbindungen (Sichtbar)** | 150 (Limit) | ~80 (Balanced) | -47% |
| **Verbindungen pro Node** | ~20 | 2-3 | -85% |
| **Glow-Intensität (Idle)** | 8px | 4px | -50% |
| **Calm Mode Threshold** | 25 Nodes | 25 Nodes | Gleich |

---

## 🎨 DESIGN-PRINZIPIEN (Beibehalten)

1. ✅ **Semantic First:** Shared Tags > Same Author > Same Type > Same Folder
2. ✅ **Deterministic Layout:** Gleiche Daten = Gleiche Visualisierung
3. ✅ **Radial Constellation:** Cluster-basierte Winkel-Segmente
4. ✅ **Focus Mode:** Hover = Spotlight auf Node + Nachbarn
5. ✅ **Firefly Mode:** Labels nur bei Hover (n > 25)
6. ✅ **Calm Energy:** Idle = sanftes Atmen, kein Chaos

---

## 🔄 VERBINDUNGS-HIERARCHIE

Die Verbindungen werden in dieser Priorität erstellt:

1. **Shared Tags** (Stärkste semantische Verbindung)
   - Nodes mit gleichen Tags werden immer verbunden
   - Keine Limits (echte Semantik)

2. **Same Author** (Mittlere Semantik)
   - Nodes vom gleichen Autor
   - Limit: Max 2-3 Verbindungen pro Node

3. **Same Type + Shared Tags** (Schwache Semantik)
   - Nur bei Documents mit gemeinsamen Tags
   - Verhindert Type-Hairballs

4. **Same Folder** (Strukturell, schwächste)
   - Nur sequenzielle Kette (Node i → Node i+1, i+2)
   - Verhindert Folder-Hairballs

**Wichtig:** Shared Tags überschreibt alle anderen Regeln!

---

## 🧪 TEST-SZENARIEN

### Szenario 1: 42 Nodes, viele Shared Tags
- **Erwartung:** Dichte semantische Cluster, wenig Folder-Rauschen
- **Verbindungen:** ~100-120 (Tag-dominiert)
- **Sichtbar:** ~80 (Balanced)

### Szenario 2: 42 Nodes, wenig Tags
- **Erwartung:** Sequenzielle Ketten, lockere Struktur
- **Verbindungen:** ~84 (Folder-dominiert)
- **Sichtbar:** ~80 (Fast alle)

### Szenario 3: 10 Nodes (Normal Mode)
- **Erwartung:** Alle Verbindungen sichtbar, kein Calm Mode
- **Verbindungen:** ~15-20
- **Sichtbar:** Alle

---

## 🚀 NÄCHSTE SCHRITTE (Optional)

1. **Intel Reports als Hubs:** Nodes vom Typ `intel_report` könnten mehr Verbindungen haben (5-7 statt 2-3)
2. **Dynamic LOD:** Bei n > 60 weitere Reduktion (1-2 Verbindungen pro Node)
3. **Connection Strength:** Linien-Dicke basierend auf Anzahl shared Tags
4. **Cluster Highlighting:** Hover auf Tag → Alle Nodes mit diesem Tag highlighten

---

## 📝 DATEIEN GEÄNDERT

- `mora-ui/lib/utils/myceliumDataMapper.ts` (Zeilen 221-242)
- `mora-ui/components/organic/Mycelium25D.tsx` (Zeilen 148-157, 351-380)

---

**Fazit:** Das Mycelium ist jetzt calm, lesbar und semantisch sinnvoll bei 40-50 Nodes. 🌿

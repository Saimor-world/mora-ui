# Bestandsaufnahme: `activeNode` / `moraState` (Stand 2026-08-14)

**Ergebnis vorweg: Es gibt nichts mehr abzulösen. Die Migration ist abgeschlossen,
der Store ist gelöscht.** Dieses Dokument hält den Befund fest, damit die Frage
nicht zum dritten Mal gestellt wird.

## Warum diese Aufnahme

Interne Notizen und `CLAUDE.md` behaupten weiterhin, `lib/store/moraState.ts`
enthalte ein `@deprecated`-Slice (`activeNode`, `setActiveNode`,
`loadNodeDetails`), das nicht entfernt werden könne, weil sechs Komponenten es
noch nutzen: DocumentViewer, MoraCommand, MoraUpdatesFeed, ResonanceRoom,
MyceliumLayer, useIntelFeed.

Diese Aussage ist **überholt**.

## Befund

`lib/store/moraState.ts` **existiert nicht mehr.** Die Ablösung lief in zwei
Schritten:

| Commit | Datum | Inhalt |
| --- | --- | --- |
| `06ed9fb` | 2026-03-30 | `refactor(store): remove activeNode/setActiveNode/loadNodeDetails` — Slice entfernt, alle Konsumenten migriert, −809 Zeilen netto |
| `0e94e21` | später | `chore(store): delete dead moraState store` — die leere Hülle gelöscht |

Kein Laufzeit-Modul referenziert heute noch `moraState` oder `useMoraStore`.
Übrig sind ausschließlich Erwähnungen in Prosa: `CLAUDE.md`,
`lib/tunnel/tunnelCatalog.ts` (dokumentierter Historieneintrag),
`lib/mora/useMoraContext.ts` (Kommentare) und `_archive/`.

## Die sechs genannten Konsumenten, einzeln

| Konsument | Status heute | Modernes Gegenstück |
| --- | --- | --- |
| `DocumentViewer` | **Datei gelöscht** (in `06ed9fb`) | `apps/document/index.tsx` (602 Zeilen, echte App) |
| `useIntelFeed` | **Datei gelöscht** (in `06ed9fb`) | `lib/api/intelClient.ts` (v3, seit MR21) |
| `MoraCommand` | migriert — `components/mora/MoraCommand.tsx:35-40` leitet `activeNodeId` aus dem fokussierten Document-Pane ab | `usePaneStore` (`activePaneId` → `pane.data.nodeId`) |
| `MoraUpdatesFeed` | migriert — `components/mora/MoraUpdatesFeed.tsx:7,133` | `usePaneStore.openPane`; das vorherige `loadNodeDetails` davor ist entfallen |
| `ResonanceRoom` | migriert — `components/mora/ResonanceRoom.tsx:7,267` | `usePaneStore.getState().openPane({ type: 'document' })` |
| `MyceliumLayer` | migriert — `components/organic/MyceliumLayer.tsx:31-36,82,100,135` | `usePaneStore`; `activeNodeId` fließt als **Prop** in `Mycelium25D` |

## Was der Name `activeNodeId` heute noch bedeutet

Die verbleibenden Treffer für `activeNodeId` sind **kein** globaler State mehr,
sondern lokale Props und Ableitungen. Sie sind korrekt und dürfen bleiben:

- `components/organic/Mycelium25D.tsx` — Prop, steuert Zentrierung/Hervorhebung
- `components/organic/MyceliumField3D.tsx` — Prop
- `lib/utils/myceliumDataMapper.ts` — Layout-Parameter (Knoten ins Zentrum setzen)
- `lib/hooks/useSemanticConstellation.ts` — hook-lokaler `useState`

`lib/tunnel/tunnelCatalog.ts` beschreibt den Sachverhalt bereits richtig:
> „activeNodeId kommt inzwischen aus usePaneStore/lokalem State, nicht mehr aus
> moraState. Migration abgeschlossen."

## Folgerung

Schritt „activeNode-Konsumenten ablösen" entfällt ersatzlos. Was bleibt, ist
**Aufräumen der Rückstände**: der gelöschte Store hat verwaiste Dateien
hinterlassen (siehe `lib/store/moraTypes.ts`, eine inzwischen tote Kopie von
`lib/types/mora.ts`), und `CLAUDE.md` führt die Migration weiter als offen.

Ebenfalls bereits erledigt und daher nicht mehr zu tun: **App-Platform Plan 2, 3
und 4**. Die Pläne liegen nicht mehr in `docs/superpowers/plans/`, `apps/`
enthält 26 echte Apps (nicht Stubs), und `components/panes/` ist auf sechs
Spezialfälle geschrumpft.

# SAIMÔR OS — Demo-Film, Schnittvorlage

Stand: 18. Oktober 2026. Produkt: SAIMÔR OS. YORI/Luana gehört nicht in diesen Film.

Ziel: In 60 Sekunden zeigen, wie ein Mensch sich im OS orientiert, mit MÔRA einen vorhandenen Inhalt findet und dessen Quelle prüft. Der Film folgt einer Aufgabe statt einer Folge von Menüs.

**Produktionsstatus:** Schnittvorlage vorbereitet. Keine Aufnahme und kein fertiges Video. Authentifizierte Sichtprüfung der Vorschau steht aus. Nicht als Produktnachweis veröffentlichen.

## Ablauf

| Zeit | Bild und Handlung | Sprechertext |
|---|---|---|
| 00–08 | Im bereits angemeldeten OS beginnen. Ruhige Totale, matte Lichtpartikel, genau eine kleine MÔRA. Kein Login im Film. | Arbeit verteilt sich auf Nachrichten, Dokumente und einzelne Werkzeuge. SAIMÔR bringt sie in einen gemeinsamen Arbeitsraum. |
| 08–17 | Eine vorhandene Abteilung und einen vorhandenen Arbeitsbereich öffnen. Die Navigation sichtbar stehen lassen. | Du siehst, wo du bist, und findest den Weg vom Unternehmen bis zum einzelnen Inhalt. |
| 17–27 | MÔRA kurz frei fliegen lassen. Hover hält sie erreichbar. Einmal auf „MÔRA öffnen“ klicken. | MÔRA begleitet dich dabei. Ein Klick öffnet das Gespräch direkt in deiner Arbeitsumgebung. |
| 27–42 | Einen vorher geprüften, vorhandenen Inhalt erfragen. Antwort ohne künstliche Beschleunigung abwarten. Antwort und Herkunft lesbar zeigen. | Entscheidend ist nicht nur eine Antwort. Entscheidend ist, worauf sie sich stützt und was du selbst nachprüfen kannst. |
| 42–53 | Den tatsächlichen Quellenverweis öffnen. Originalinhalt und Navigationsweg zeigen. Nur aufnehmen, wenn der Verweis funktioniert. | Du gehst von der Antwort zurück zur Quelle und kannst den Zusammenhang selbst beurteilen. |
| 53–60 | Zur ruhigen Gesamtansicht zurückkehren. MÔRA bleibt einmal sichtbar. Endtitel „SAIMÔR OS · Produktvorschau“. | Orientierung gewinnen. Zusammenhänge erkennen. Den nächsten Schritt selbst entscheiden. |

## Aufnahmegrundlage

- Geprüfter Code für MÔRAs Körper: Draft-PR https://github.com/Saimor-world/mora-ui/pull/131, Commit `0f2cceb003c0218a4c25c4a9eafcfe164b4245cb`.
- Die bestehende CI ist grün; sie ersetzt keine Sichtprüfung und keinen Nachweis der Antwort-zu-Quelle-Kette.
- MÔRA ist laut `components/mora/Dock.tsx` außerhalb von `public_playground` eingebunden. Der Film benötigt den passenden angemeldeten Workspace; nicht in einen Demo-Modus wechseln und dort die neue Figur behaupten.
- Reale Navigationsziele aus `HomeSurface`, `DepartmentLayer` und `SpaceLayer` verwenden. Keine alten Konzeptdokumente als aktuellen Funktionsnachweis behandeln.
- Vor Aufnahme genau einen freigegebenen, unkritischen Inhalt auswählen und Frage, Antwort, Quellenverweis und Original manuell prüfen. Keine privaten Postfächer, Kundendaten, Tokens oder Login-Formulare filmen.
- Wenn Antwort oder Quelle fehlen: Aufnahme dieses Handlungsstrangs stoppen und den Fehler festhalten. Keine vorbereitete Antwort als Live-Antwort einblenden.

## Gestaltung und Schnitt

1920 × 1080, 16:9. Native Bildrate der tatsächlichen Aufnahme beibehalten; kein hochgerechnetes „120 FPS“-Versprechen. Bewegungen auslaufen lassen, keine hektischen Cursorfahrten. Schnitte nur zwischen abgeschlossenen Handlungen. Lange Wartezeiten dürfen gekürzt werden, dann sichtbar mit „Wartezeit gekürzt“ kennzeichnen. Musik leise unter der Stimme, ohne fremde Markenmelodien. Untertitel in `os-demo-video.srt` sind eine vorläufige 60-Sekunden-Taktung und nach der Aufnahme mit der Stimme abzugleichen.

## Fertig, wenn

Ein abspielbares MP4 mit überprüftem Bild und Ton vorliegt; eine einzelne MÔRA sichtbar ist; die Quelle wirklich zum gezeigten Inhalt führt; keine privaten Daten oder Anmeldedaten enthalten sind; und Start, Ende sowie Untertitel nach dem Export kontrolliert wurden. Der Film wird hier vorbereitet, nicht automatisch veröffentlicht.

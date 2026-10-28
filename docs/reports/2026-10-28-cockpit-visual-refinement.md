# Cockpit: visuelle Verfeinerung auf #194

Basis: `296124808d7749d6f46caa0c1e4b121d8866a5d0` (`grok/home-universe-backbone`). Risiko A, lokaler UI-Zustand und Darstellung. Kein Merge, kein Deploy. #191 bleibt unberührt; keine Jade-Assets übernommen.

## Beobachtung und Änderung

Der Name des geöffneten Planeten hing an der nach unten versetzten Horizontgrafik und konnte hinter dem Dock verschwinden. Die Beschriftung ist jetzt eine unabhängige Überschrift mit Dock-Abstand. Monde sind auf dem Desktop 90 statt 60 Pixel, mobil 72 statt 48 Pixel groß und liegen im Bogen über dem Horizont. Das Eigentümer-Home erhält mobil einen schmalen Planetenstreifen; die Desktop-Planeten sind größer. Die Cockpit-Scheibe hat geradlinige, sichtbare Streben und einen ruhigen Lichtsaum. Der warme Originalnebel bleibt, mit einer zweiten dezenten Nebelschicht und weniger Türkis. Pixel-MÔRA aus dem bestehenden Final-Set steht im Universe über dem Horizont; auf Home bleibt sie im Dock.

Referenzen: `konzept2_smooth_painted.jpg` (warmer Nebel, Glasplaneten und Pixel-MÔRA), `konzept4_planet_offen.jpg` (großer Horizont und größere Monde darüber). Sie sind Gestaltungsreferenzen, kein Nachweis der Umsetzung.

## Abnahme

Der separate **Cockpit before-after QA**-Workflow baut die unveränderliche Basis 2961248 und den Kandidaten nacheinander. Er nimmt dieselben sieben Ansichten in Chromium bei 1440×900, 1180×820 und 390×844 auf: Home, Firma, Küche, Rezepte-Ordner, Verwaltung mit vier Monden, Mitarbeiter-Home und reduzierte Bewegung. Artefakte enthalten Revision und Viewport im Pfad. Der Kandidat prüft zusätzlich mobile Planeten, sichtbare Demo-Kennzeichnung, Titelabstand, Mindestgrößen und Tastaturnavigation. Physisches iPhone/Safari ist damit nicht geprüft.

Drei neue Interaktionstests schlagen auf der Basis fehl und bestehen mit der Änderung. Die elf bestehenden Home-Modelltests bleiben grün. Typecheck und gezieltes ESLint bestehen lokal. Der vollständige CI-/Build- und Browserstatus muss am Draft-PR geprüft werden; dieser Bericht behauptet dafür vor Abschluss keinen Erfolg.

## Produktwahrheit und weitere Reihenfolge

Café Morgenrot bleibt ausdrücklich eine **fiktive Demo**. Freigaben und Tagesaktionen verändern nur den vorhandenen lokalen Demo-Tag, keine CORE-Daten. Der Mikrofonknopf füllt weiterhin nur Demo-Text vor. Keine Änderung an Auth, /owner, Middleware, Secrets oder Deployment-Konfiguration.

Nach visueller Prüfung: ein gemeinsamer Home-Renderer mit generischen Widget-Typen, ausschließlich aus tatsächlich angebundenen Quellen und dem Onboarding-Verständnis. Keine Branchenschalter oder festen Café-Vorlagen. Das eigene HQ und Kunden bleiben getrennt, Finanzen nur im Owner-HQ. Danach Abteilungen mit Head-MÔRA. Diese beiden Phasen sind mit diesem visuellen Commit noch nicht umgesetzt.

Rückbau: Commit auf dem Feature-Branch zurücknehmen; keine Datenmigration, keine externen Schreibaktionen.

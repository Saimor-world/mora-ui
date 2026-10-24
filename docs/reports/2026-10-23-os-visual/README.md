# Saimôr OS visuell – Prüfung und Umbau (23.10.2026)

Branch `claude/os-visual-mora`, Basis `main` 51bf3fcd. Entwurf, kein Merge, kein Deploy.

## 1. Marius' MÔRA – wo sie liegt

- **Stein:** `public/brand/mora-stone-v1.png` (Jadestein mit Goldring, freigegeben 14.09., dasselbe Bild wie auf saimor.world).
- **Augen:** `components/mora/MoraFace.tsx` – Licht im Stein (A4, freigegeben 14.10.), mit Adern-Maske aus `app/mora-stone.css`. Auf der Website dieselbe Kombination (`MoraFocusStone` + `MoraOsFace`).
- Auf `main` zeigte das OS (`/os`) den Stein **ohne** Augen (`components/os-kit/MoraStone.tsx`); nur die klassische Oberfläche (`MoraOrb`, `Dock`) setzte die Augen darauf.
- Jetzt: `os-kit/MoraStone` legt `MoraFace` über das PNG (ab 24 px). Damit hat MÔRA im Universe-Zentrum, auf Heute, im Dock und im MÔRA-Fenster Marius' Augen. Kein Nachbau; `components/mora/MoraStone.tsx` aus #152 wird nicht verwendet.

## 2. Was von main bleibt

- Navigation: Tabs oben (Heute/Universe), Dock unten.
- Universe-Hintergrund `public/universe/deep-space-warm.jpg`.
- Planeteninneres `components/universe/PlanetInterior.tsx` (jetzt als Fenster über dem Universe).

## 3. Problemstellen auf main (vorher) und was daraus wurde

Geprüft mit Beispiel-Sitzung („Beispiel-Studio Lea“, Kundin, keine echten Daten), lokal.

| Stelle | Vorher | Nachher |
|---|---|---|
| MÔRA | Stein ohne Augen in /os | Stein mit Marius' Augen überall |
| Universe mit Sitzung | Organisationsfeld (UniverseView) stürzte mit den Beispiel-Daten ab (`startsWith`) – möglicherweise durch die Form der Testdaten, nicht weiter verfolgt | Neues Universe aus echten Abteilungen (`/v3/tree`), MÔRA in der Mitte, matte Planeten (visual-v1) auf Bahnen, leichtes Schweben statt Umlauf |
| Planet öffnen | – | PlanetInterior als Fenster, „Zurück zum Universe“, Esc |
| Handy | Hinweis „am besten auf Desktop“; Dock lief über den Rand (MÔRA abgeschnitten); Tabs oben abgeschnitten | Hinweis weg; Dock und Tabs passen auf 390 px; Home V4 |
| Abgeschnittene Namen | „Maniküre – Soph…“ auf Heute | Namen brechen um, nie „…“ |
| Interne Bereiche bei Kundinnen | Finance, Labs, klassische Oberfläche, Nightwatch-Karte, Finance-Signal sichtbar | nur SAIMÔR intern (Rolle/Tenant, fail-closed) |
| Technik-Texte | „/v3/agency/thoughts“, „Tagesbild: /v3/today“, „Datenvertrag … CORE-Build“, „CORE erreichbar“ | Pfade und Build-Begriffe nur intern; Kundinnen sehen Klartext; CORE-Status nur bei Problemen |
| Café-Beispiel in echter Firma | „So sähe es aus (Beispiel) · Simple Coffee Group“ im Morgenbriefing | nur noch in der Vorschau ohne Sitzung |
| E-Mail als Name | Profil ohne Namen → E-Mail-Adresse als Name | „Inhaberin“/„Mitglied“ |
| MÔRA-Blatt am Handy | Eingabefeld unter dem Dock | Blatt endet über dem Dock |

## 4. Bilder

`vorher-*` = main, `nachher-*` = dieser Branch. Computer 1440×900, Handy 390×844, als Bild des Browser-Bereichs (Computer verkleinert auf 800×500).
Full HD (1920×1080) wurde über DOM-Maße geprüft (keine Überlappung, nichts abgeschnitten, MÔRA 156 px, Planeten 82–103 px); ein unverzerrtes Bild in 1920×1080 ließ der Browser-Bereich nicht zu.

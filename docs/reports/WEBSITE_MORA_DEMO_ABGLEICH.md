# Abgleich: MÔRA-Demo der Website ↔ echtes OS

Stand 2026-10-21. Verglichen wurden
Website `main` @ `dfa9ce4` (`components/MoraProductPage.tsx`, eingebettet in `/mora` und `/en/mora` mit `embedded`),
mora-ui `main` @ `45917470` und CORE `main` @ `d7f9a64`.

Dieses Dokument ändert die Website nicht. Die Website gehört nicht in die Dateien von Claude Code,
Änderungen dort übernehmen ChatGPT/Gemini bzw. Head.

## Ergebnis auf einen Blick

| # | Aussage der Website-Demo | Echter Stand | Bewertung |
|---|---|---|---|
| 1 | MÔRA ist der Jadestein, „dasselbe A4-Lichtgesicht wie im OS“ (Kommentar in `MoraCharacter.tsx`) | OS zeigt den Jadestein mit Lichtgesicht `MoraFace` (A4, freigegeben 14.10.) | stimmt im Bild |
| 2 | Vier Zustände: **Ruht, Träumt, Spricht, Hört zu** (`MoraMood = rest \| dream \| speak \| listen`) | OS-Gesicht kennt `rest, greet, listen, think, work, done, need` (`components/mora/MoraFace.tsx`). Es gibt **kein „dream“ und kein „speak“** | **weicht ab** |
| 3 | Website-„Hört zu“ wird intern als `dream` gezeichnet (`state === 'listen' ? 'dream' : state`) | Im OS sieht „listen“ anders aus als jeder Traumzustand | **weicht ab**, wirkt wie ein Versehen |
| 4 | „Träumt: MÔRA ordnet, was passiert ist, verbindet nur mit Grund“ | CORE-Myzel: Trockentraum mit Regeln, Vorschläge nur lesbar, alter Organiser abgeschaltet, Flags standardmäßig aus (#36, #37, #39, #46) | Formulierung zu stark für den heutigen Stand: MÔRA **schlägt** Verbindungen vor, sie ordnet nicht selbst |
| 5 | Arbeitskontext aus Dateien, Terminen, offenen Dingen | OS hat Meine Dateien, Kalender, Aufgaben/Heute; Mail erstmals echt per verifiziertem IMAP (CORE #95) | stimmt, mit „kann“ korrekt eingeschränkt |
| 6 | „Aus dem Zusammenhang kann MÔRA einen nächsten Schritt vorbereiten. Aktionen brauchen Freigaben.“ | Freigabe-Schleife (CORE #113), Begleiter mit Passkey-Freigaben (CORE #114). Proaktive Vorschläge (max. 3, nie senden) erst in mora-ui PR #138, **nicht auf main** | stimmt grundsätzlich; die Vorschläge im Universe sind noch nicht live |
| 7 | Demo-Raum getrennt, eigene Daten nur über verbundene Quellen | Website `/api/demo-launch` → OS `/entry?token` → `/api/auth/website-entry-login`; CORE isolierte Testzugänge (#16) und Mandantentrennung (#24) | stimmt |
| 8 | Externe Modellanbieter, MÔRA ist nicht das Modell | CORE-Routing mit EU/lokal-Gate (#15, #23) | stimmt |
| 9 | Beispiel ist als „EIN BEISPIEL · KEINE LIVE-DATEN“ markiert | – | gut so, beibehalten |

## Empfehlungen für die Website (nicht von Claude umgesetzt)

1. **Zustände angleichen** (Punkte 2 und 3). Vorschlag: die vier Website-Zustände auf echte OS-Zustände
   abbilden, z. B. *Ruht* → `rest`, *Hört zu* → `listen`, *Denkt nach* → `think`, *Arbeitet* → `work`.
   „Träumt“ nur behalten, wenn das OS einen sichtbaren Traumzustand bekommt.
   Die Zuordnung `listen → dream` entfernen.
2. **„Träumt“-Text abschwächen** (Punkt 4), z. B. „MÔRA schlägt Verbindungen vor, du entscheidest“.
3. **Ein gemeinsamer Zustandskatalog**: Die Liste der Gesichtszustände lebt heute doppelt
   (Website `MoraCharacter`, OS `MoraFace`). Langfristig eine Quelle, z. B. ein kleines geteiltes Paket
   oder eine JSON-Datei, die beide Repos lesen. Das ist eine Architekturentscheidung für Head.
4. Punkt 6 erst dann als Universe-Erlebnis zeigen, wenn PR #138 (oder sein Nachfolger) auf main ist.

## Was im OS zu tun wäre

Nichts zwingend. Falls „Träumt“ ein eigener sichtbarer Zustand werden soll, gehört er als neuer
`FaceState` in `components/mora/MoraFace.tsx` und braucht eine Freigabe des Bildes durch Marius
(Regel 14.09.: das Steinbild wird nie verändert, nur die Lichtschicht).

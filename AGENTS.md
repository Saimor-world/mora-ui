# SAIMÔR OS – Agenten- und Engineering-Vertrag
Stand 14.10.2026 · Vorschlag im Draft-PR. Kein Auto-Deploy.

Saimôr OS ist eine Oberfläche der einen MÔRA; CORE ist die Quelle für Auth, Rollen, Mandantenrechte, Änderungen und Datenwahrheit. Keine konkurrierende Agenten- oder Schreiblogik in der UI.

## Arbeitsregeln
- Vor Änderung aktuelle Komponenten, Tests, Navigation und vorhandene Integrationen prüfen. Kein zweites Control Center, App Center oder Labs nur als Kulissen bauen.
- Bestehende Oberfläche konsolidieren: Platzhalter ehrlich markieren; echte Funktion nur behaupten, wenn belegt und benutzbar.
- Branch + PR; niemals direkt `main`. Bestehende Designentscheidungen und Datenpfade bewahren, kein großflächiges Redesign neben einem Bugfix.
- Keine Produktions-Secrets, Tokens, privaten Kunden-/Finanzdaten in Browserbundles, Demo-Seed, Logs oder Screenshots. Autorisierung durch CORE erzwingen, nicht durch ausgeblendete Buttons.
- Bei UI-Änderungen auch iPhone/Touch, Tastatur und kritische Zustände (loading/error/empty/unauthorized) prüfen.
- Demo/Preview/Live sichtbar unterscheiden. Keine echten Finanz-, Kalender-, Mail- oder Kundenaktionen als Demo ausgeben.
- Auth, Billing, Rollen, Domain, integrationsbezogene Außenaktionen nur mit gesonderter ausdrücklicher Freigabe.

## Fertig-Definition
1. Problem und beobachtetes Verhalten, Akzeptanzkriterien, betroffene Ansichten schriftlich.
2. Gezielte Unit-/Interaktionstests und gegebenenfalls Playwright-/Mobilprüfung hinzufügen.
3. Bestehende Gates aus `.github/workflows/ci.yml`: lint, `verify:types`, `verify:critical-flow`, `verify:os:smoke`, tests, build. Genaue Ergebnisse belegen; nicht als erfolgreich ausgeben, wenn ungetestet.
4. Screenshots nur mit nachvollziehbarem Branch/Commit und Geräte-/Viewportangabe. Bei Änderung an kritischem Pfad: negative Fälle testen.
5. PR mit Risiko A/B/C, CI-Belegen, Produktwahrheit, Rückbau. Stufe B/C nur mit dokumentierter AI-Gegenprüfung + Freigabe von Marius; AI ist keine zweite menschliche Unterschrift.
6. Merge oder Preview ist keine Produktionsfreigabe. Deploy nur über bestehendes explizites Release-Gate.
7. Abschluss: VERIFIED / PREPARED / BLOCKED.

Zentrale Orientierung: `Saimor-world/saimor-ops/docs/team/REVIEW_BOARD.md` (Entwurf). Bestehende technische Schutzregeln gelten weiter.

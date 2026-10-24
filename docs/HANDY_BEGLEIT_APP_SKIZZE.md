# Skizze: Handy-Begleit-App (Companion App)
**Saimôr OS · Entwurf für mobile Begleitung**  
*Autor: Antigravity (Gemini) · Stand: 24.10.2026*  
*Konform zu Regel: „Handy = Begleit-App (Heute, Aufgaben, Termin abschließen, kurzer MÔRA-Chat) – kein volles Universe“*

---

## 1. Ausgangslage & Design-Leitsatz

> [!IMPORTANT]
> **Der Desktop ist das echte Erlebnis.**  
> Am Handy versucht SAIMÔR OS **nicht**, das Universe mit tief verschachtelten 3D-Sphären, Ordnern und Dokumenten-Sternen auf 390 Pixel Breite zu quetschen.  
> Stattdessen ist das Smartphone die **reine Studio-Begleitung für die Hosentasche** während des laufenden Arbeitstags:
> 1. Sofort sehen, was als Nächstes ansteht.
> 2. Mit einem einzigen Tap den aktuellen **Termin abschließen** (inklusive Farbwunsch und Beleg).
> 3. Aufgaben im Vorbeigehen **abhaken mit verlässlichem Rückgängig-Toast**.
> 4. Kurzer **MÔRA-Chat / Spracheingabe** für spontane Studio-Fragen („Termin um 15 Min verschieben“, „Farbe bestellen“).

---

## 2. Struktur & Navigationsmodell (3 Tabs)

Auf dem Handy werden **Finance, Labs, Wissen und das volle Universe komplett ausgeblendet**.  
Die Navigation beschränkt sich auf ein leichtes, schwebendes 3-Element-Dock am unteren Bildschirmrand:

| Element | Funktion | Inhalt |
| :--- | :--- | :--- |
| **`Heute`** (Tab 1) | Tagesübersicht | MÔRA-Briefing, Hero-Karte des anstehenden Termins mit Button **„Termin abschließen“**, horizontaler Tagestreifen aller 6 Slots. |
| **`MÔRA`** (Zentrum) | Schnelldialog | Echtes MÔRA-Medaillon (`mora-stone-v1.png`). Öffnet den zentrierten MÔRA-Sprach-/Text-Dialog mit Schnellaktions-Chips. |
| **`Aufgaben`** (Tab 2) | To-Do & Material | Schlanke Liste der offenen Fälligkeiten („Gel-Farbe Herbstrot nachbestellen“, „Instagram posten“) mit Sofort-Abhaken & Rückgängig. |

---

## 3. Kernfunktionen der Begleit-App

### A. Termin abschließen (1-Tap-Workflow)
* **Aktuelle Kundin im Fokus:** `09:30 Michelle W. · Auffüllen (60 Min)`.
* **Details auf einen Blick:** Wunschfarbe Herbstrot/Nude, Notiz zur Empfindlichkeit am Nagelbett.
* **Aktion:** Große grüne Schaltfläche `[✓ Termin mit Michelle abschließen]`.
* **Rückgängig-Sicherheit:** Nach dem Klick erscheint ein 3,5-Sekunden-Toast mit `[Rückgängig]`. Der Status wird synchronisiert, ohne dass Lea in Untermenüs navigieren muss.

### B. Aufgaben mit sofortiger Feedback-Schleife
* Zwei dringende Aufgaben mit visueller Farbcodierung:
  * 🔴 **Gel-Farbe Herbstrot nachbestellen** (Heute fällig · Materialengpass bei Nailstore)
  * ⚠️ **Instagram: Herbst-Designs posten** (Überfällig seit 22.10. · 3 Kundenanfragen warten)
* Antippen hakt die Aufgabe ab (durchgestrichen + gedimmt) und bietet im Toast sofort `[Rückgängig]`.

### C. Kurzer MÔRA-Chat & Spracheingabe
* Vorgefertigte 1-Tap-Chips für typische Situationen mit Handschuhen im Nagelstudio:
  * `[Termin verschieben]`
  * `[Farbe bestellen]`
  * `[Kasse heute]`
* Text- und Mikrofon-Eingabe für freie Befehle.

---

## 4. Klickbarer Prototyp

Der interaktive Prototyp liegt bereit unter:
👉 [`docs/skizzen/handy-begleit-app.html`](./skizzen/handy-begleit-app.html) (Auflösung: 390 × 844 px).

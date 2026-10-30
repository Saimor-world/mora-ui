# Demo-Firma „Café Morgenrot“ (FIKTIV)

Isolierte Demo-Daten für eine spätere zweite Instanz (`demo.saimor.world`). Alle Personen außer Marius, alle Schichten und Aufgaben sind **fiktiv**.

- `seed.ts`: Firma, 4 Accounts (Inhaber/owner, Service/manager, Küche/member, Aushilfe/member), Schichten, Aufgaben
- `jobRoles.ts`: Fachrollen, zusätzlich zu den System-Rollen in `lib/auth/roles.ts`
- `morningPlan.ts`: 07:00-Job, der für jede Person einen Tagesplan erstellt. Der Inhaber sieht Team und Freigaben, Mitarbeitende nur ihre eigene Schicht.
- Scheduler: `npx tsx scripts/demo-morgenrot/morning-plan.ts --force --date 2026-10-28`

Noch nicht enthalten: DB-Persistenz, echte Logins, Zustellung in die OS-Oberfläche.

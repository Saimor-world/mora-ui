import type { UserRole } from '@/lib/types/mora';
import type { JobRoleId } from './jobRoles';

export const FICTIONAL_NOTICE =
  'FIKTIVE DEMO-FIRMA: Café Morgenrot, alle Mitarbeitenden, Schichten und Aufgaben sind fiktiv.';

export interface DemoPerson {
  id: string;
  name: string;
  systemRole: UserRole;
  jobRole: JobRoleId;
  fictional: boolean;
}
export interface DemoShift { personId: string; date: string; start: string; end: string }
export interface DemoTask {
  id: string; date: string; assignee: string; title: string; due?: string; needsApproval?: boolean;
}
export interface DemoCompany {
  company: { id: string; name: string; city: string; fictional: true; opening: string };
  people: DemoPerson[];
  shifts: DemoShift[];
  tasks: DemoTask[];
}

const D1 = '2026-10-28';
const D2 = '2026-10-29';

export const MORGENROT_SEED: DemoCompany = {
  company: { id: 'demo-morgenrot', name: 'Café Morgenrot (FIKTIV)', city: 'Stuttgart', fictional: true, opening: '08:00–18:00' },
  people: [
    { id: 'marius', name: 'Marius', systemRole: 'owner', jobRole: 'inhaber', fictional: false },
    { id: 'lena', name: 'Lena K. (fiktiv)', systemRole: 'manager', jobRole: 'service', fictional: true },
    { id: 'tarek', name: 'Tarek B. (fiktiv)', systemRole: 'member', jobRole: 'kueche', fictional: true },
    { id: 'jonas', name: 'Jonas P. (fiktiv)', systemRole: 'member', jobRole: 'aushilfe', fictional: true },
  ],
  shifts: [
    { personId: 'tarek', date: D1, start: '06:30', end: '14:30' },
    { personId: 'lena', date: D1, start: '07:30', end: '16:00' },
    { personId: 'jonas', date: D1, start: '11:00', end: '18:00' },
    { personId: 'tarek', date: D2, start: '06:30', end: '14:30' },
    { personId: 'lena', date: D2, start: '09:30', end: '18:00' },
  ],
  tasks: [
    { id: 't1', date: D1, assignee: 'tarek', title: 'Teig für Zimtschnecken ansetzen', due: '07:00' },
    { id: 't2', date: D1, assignee: 'tarek', title: 'Hafermilch-Bestand zählen (Bestellung Do)', due: '13:00' },
    { id: 't3', date: D1, assignee: 'lena', title: 'Reservierung 12 Pers. 12:30 eindecken', due: '12:00' },
    { id: 't4', date: D1, assignee: 'lena', title: 'Zwei neue Google-Bewertungen beantworten', due: '15:00' },
    { id: 't5', date: D1, assignee: 'jonas', title: 'Terrasse winterfest räumen', due: '12:00' },
    { id: 't6', date: D1, assignee: 'jonas', title: 'Spülmaschine entkalken', due: '17:30' },
    { id: 't7', date: D1, assignee: 'marius', title: 'Lieferantenbestellung Kaffee freigeben (fiktiv, 214 €)', needsApproval: true },
    { id: 't8', date: D1, assignee: 'marius', title: 'Urlaubsantrag Lena 18.–22.11. freigeben', needsApproval: true },
    { id: 't9', date: D2, assignee: 'tarek', title: 'Kürbissuppe vorbereiten', due: '10:00' },
  ],
};

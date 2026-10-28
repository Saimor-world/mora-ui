import { hasMinRole } from '@/lib/auth/roles';
import type { DemoCompany } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_STRUCTURE, orderTotal, type DemoEvents } from '@/lib/demo/morgenrot/structure';
import { reviewsOpen, type DemoAction, type DemoDay } from './demoDay';
import { visiblePlanets } from './homeModel';

/** Antwort von MÔRA in der Vorführung: nur aus Demo-Daten, mit optionaler Aktion. */
export interface MoraReply { text: string; openMoon?: string; action?: DemoAction; confirm?: string }

const first = (n: string) => n.split(' ')[0];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');

export function askMora(q: string, viewerId: string, data: DemoCompany, ev: DemoEvents, date: string, day: DemoDay): MoraReply {
  const t = norm(q.trim());
  const me = data.people.find((p) => p.id === viewerId)!;
  const owner = hasMinRole(me.systemRole, 'owner');
  if (!t) return { text: 'Frag mich nach Team, Bestellung, Bewertungen oder einem Ordner.' };

  const msg = t.match(/^(?:sag|schreib|frag)\s+(\w+)[,:]?\s+(.+)$/);
  if (msg) {
    const to = data.people.find((p) => norm(first(p.name)) === msg[1]);
    if (to && to.id !== me.id) {
      const raw = q.trim().replace(/^\S+\s+\S+[,:]?\s+/, '').replace(/^(sie|er)\s+(soll|möge)\s+/i, '').replace(/^dass\s+/i, '');
      const text = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/[.!]*$/, '.');
      return { text: `Ich schicke ${first(to.name)}: „${text}“`, confirm: 'Senden', action: { type: 'note', from: me.id, to: to.id, text } };
    }
  }
  if (/umsatz|zahlen|gestern|einnahm|kasse/.test(t)) {
    if (!owner) return { text: 'Zahlen sieht in der Demo nur Marius.' };
    const close = day.close ? ` Heute abgeschlossen von ${first(data.people.find((p) => p.id === day.close!.by)!.name)}: ${day.close.cash.toLocaleString('de-DE')} €.` : '';
    return { text: `Gestern ${ev.yesterday.revenue.toLocaleString('de-DE')} €, ${Math.round(ev.yesterday.vsLastWeek * 100)} % mehr als letzte Woche, ${Math.round(ev.yesterday.card * 100)} % mit Karte. Die Kasse hat gestimmt.${close}`, openMoon: 'v-zahl' };
  }
  if (/wer|team|schicht|arbeitet|dienst/.test(t)) {
    const lines = data.shifts.filter((s) => s.date === date).map((s) => `${first(data.people.find((p) => p.id === s.personId)!.name)} ${s.start}–${s.end}`);
    const swap = day.swap === 'requested' ? ' Der Tausch am Donnerstag wartet noch auf Marius.' : day.swap === 'approved' ? ' Der Tausch am Donnerstag ist freigegeben.' : '';
    return { text: `Heute: ${lines.join(', ')}.${swap}` };
  }
  if (/bestell|hafer|milch|kaffee|liefer/.test(t)) {
    const oat = day.oatCount !== null ? ` Tarek hat ${day.oatCount} l Hafermilch gezählt.` : ' Tarek zählt die Hafermilch bis 13:00.';
    if (day.order === 'approved') return { text: `Die Bestellung für Donnerstag ist freigegeben (${orderTotal(ev)} €).${oat}` };
    if (!owner) return { text: `Die Bestellung für Donnerstag ist vorbereitet und wartet auf Marius.${oat}` };
    return { text: `Für Donnerstag liegen bereit: ${ev.order.lines.map((l) => `${l.qty} ${l.item}`).join(', ')} – ${orderTotal(ev)} €. Bestellschluss ${ev.order.cutoff}.${oat}`, confirm: 'Freigeben', action: { type: 'order' } };
  }
  if (/bewert|review|google/.test(t)) {
    const n = reviewsOpen(day);
    if (!n) return { text: 'Alle drei Bewertungen sind beantwortet.' };
    return owner ? { text: `${n} Antworten sind in deinem Ton entworfen. Die 3-Sterne-Antwort verspricht eine zweite Person an der Theke.`, confirm: 'Alle freigeben', action: { type: 'reviewsAll' } }
      : { text: `${n} Antworten sind entworfen und warten auf Marius.`, openMoon: 's-bew' };
  }
  if (/aufgabe|was muss|zu tun|todo/.test(t)) {
    const mine = data.tasks.filter((x) => x.date === date && x.assignee === me.id && !day.done.includes(x.id));
    return { text: mine.length ? `Offen: ${mine.map((x) => x.title.replace(/\s*\(.*?\)/g, '')).join(' · ')}.` : 'Für dich ist heute nichts mehr offen.' };
  }
  for (const p of visiblePlanets(MORGENROT_STRUCTURE, data, viewerId)) {
    for (const m of p.moons) {
      if (t.includes(norm(m.title)) || t.includes(norm(m.title).replace(/en$/, ''))) return { text: `Ich öffne ${m.title} in ${p.title}.`, openMoon: m.id };
      const file = m.files.find((x) => norm(x.name).split(/[\s·„“]+/).some((w) => w.length > 4 && t.includes(w)));
      if (file) return { text: `${file.name}: ${file.body[0]}`, openMoon: m.id };
    }
  }
  if (/terrasse/.test(t)) return { text: 'Die Terrasse räumt Jonas heute bis 12:00 winterfest.' };
  return { text: 'Dazu habe ich in der Demo keine Daten. Frag mich nach Team, Bestellung, Bewertungen, Zahlen oder einem Ordner.' };
}

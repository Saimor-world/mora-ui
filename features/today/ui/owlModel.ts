/** Reine Ableitungen für die Eulen-Karte – nur aus echten CORE-Feldern, nichts erfunden. */
export interface OwlMail { id?: string; subject: string; from_addr?: string; date?: string; kind: string; read?: boolean }
export interface OwlLike {
  level: 'ok' | 'warning' | 'critical';
  open_incidents: { id: string; title: string; severity: string; status: string }[];
  uptime?: { available: boolean; down: number; monitors: { name: string; up: boolean }[] };
  crowdsec?: { available: boolean; running?: boolean; active_decisions?: number; alerts_24h?: number };
  hetzner?: { overall?: string; costs?: { servers_monthly_gross_eur?: number | null } } | null;
  mail?: { unread?: number; total?: number; highlights?: OwlMail[] };
}

const NOISE = /substack\.com|newsletter|@nl\.|\bnl\.|oracle-mail|marketing|news@|newsletter@|promo|beratung@|mailchimp|hubspot|linkedin\.com|xing\.com|medium\.com|umfrage|survey/i;
const IMPORTANT_SUBJECT = /rechnung|mahnung|zahlung|invoice|payment|limit|sicherheit|security|frist|kündigung|vertrag|warnung|alert|ausfall|down|steuer|finanzamt|bank|konto|passwort|password|anmeldung|login/i;
const SERVICE_SENDER = /hetzner|vercel|github|google|stripe|paypal|finanzamt|sparkasse|bank|elster|telekom|apple|cloudflare/i;

/** Wichtig = Rechnung, Dienst-Warnung oder Frist. Newsletter/Werbung fallen raus. */
export function isImportant(m: OwlMail): boolean {
  if (m.kind === 'bill') return true;
  const from = m.from_addr || '';
  if (NOISE.test(from)) return false;
  return IMPORTANT_SUBJECT.test(m.subject || '') && (SERVICE_SENDER.test(from) || /rechnung|mahnung|zahlung|frist/i.test(m.subject || ''));
}

export function importantMails(s: OwlLike): OwlMail[] {
  const all = (s.mail?.highlights || []).filter(isImportant);
  return [...all.filter((m) => m.kind === 'bill'), ...all.filter((m) => m.kind !== 'bill')];
}

/** „Accounting - Hetzner Online GmbH <billing@…>“ → „Hetzner Online GmbH“. */
export function senderLabel(from?: string): string {
  const raw = String(from || '').trim();
  let name = raw.replace(/<[^>]*>/, '').replace(/^"|"$/g, '').replace(/"/g, '').trim();
  if (!name) name = raw.replace(/[<>]/g, '').split('@')[1] || raw;
  const parts = name.split(' - ');
  return (parts.length > 1 ? parts[parts.length - 1] : name).trim();
}

export function relTime(date?: string, now = new Date()): string {
  if (!date) return '';
  const t = Date.parse(date.replace(/\s*\([A-Z]+\)\s*$/, ''));
  if (Number.isNaN(t)) return '';
  const min = Math.round((now.getTime() - t) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
}

const NUM = ['Keine', 'Eine', 'Zwei', 'Drei', 'Vier', 'Fünf'];
const n = (k: number) => NUM[k] ?? String(k);

/** Ein menschlicher Satz aus der echten Lage. */
export function owlHeadline(s: OwlLike): string {
  const inc = (s.open_incidents ?? []).length;
  const down = s.uptime?.available ? s.uptime.down : 0;
  const imp = importantMails(s);
  const bills = imp.filter((m) => m.kind === 'bill').length;
  const other = imp.length - bills;
  const first = inc ? `${n(inc)} offene${inc === 1 ? 'r' : ''} Vorfall${inc === 1 ? '' : 'e'}.` : down ? `${n(down)} Dienst${down === 1 ? ' ist' : 'e sind'} nicht erreichbar.` : 'Alles ruhig.';
  const rest: string[] = [];
  if (inc && down) rest.push(`${n(down)} Dienst${down === 1 ? ' ist' : 'e sind'} nicht erreichbar.`);
  if (bills) rest.push(bills === 1 ? 'Eine Rechnung ist offen.' : `${n(bills)} Rechnungen sind offen.`);
  if (other) rest.push(other === 1 ? 'Eine wichtige Mail wartet.' : `${n(other)} wichtige Mails warten.`);
  return [first, ...rest].join(' ');
}

export type ChipTone = 'ok' | 'warn' | 'crit' | 'idle';
export interface Chip { key: string; label: string; value: string; tone: ChipTone }

const eur = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function owlChips(s: OwlLike): Chip[] {
  const chips: Chip[] = [];
  const inc = (s.open_incidents ?? []).length;
  chips.push({ key: 'incidents', label: 'Vorfälle', value: inc ? `${inc} offen` : 'Keine', tone: inc ? (s.level === 'critical' ? 'crit' : 'warn') : 'ok' });
  if (s.uptime?.available) {
    const total = s.uptime.monitors.length;
    chips.push({ key: 'uptime', label: 'Erreichbarkeit', value: s.uptime.down ? `${s.uptime.down} von ${total} aus` : total ? `${total} von ${total} da` : 'Noch keine Prüfung', tone: s.uptime.down ? 'crit' : total ? 'ok' : 'idle' });
  }
  if (s.crowdsec?.available) {
    const a = s.crowdsec.alerts_24h ?? 0;
    chips.push({ key: 'crowdsec', label: 'Abwehr', value: !s.crowdsec.running ? 'Aus' : (s.crowdsec.active_decisions ?? 0) ? `${s.crowdsec.active_decisions} gesperrt` : a ? `Aktiv · ${a} Alarm${a === 1 ? '' : 'e'}` : 'Aktiv', tone: !s.crowdsec.running ? 'crit' : a ? 'warn' : 'ok' });
  }
  const cost = s.hetzner?.costs?.servers_monthly_gross_eur;
  if (cost != null) {
    const o = (s.hetzner?.overall || '').toUpperCase();
    chips.push({ key: 'hetzner', label: 'Server', value: `${eur(cost)} / Monat`, tone: o === 'OK' ? 'ok' : o === 'CRIT' || o === 'CRITICAL' ? 'crit' : 'warn' });
  }
  if (s.mail?.unread != null) chips.push({ key: 'mail', label: 'Post', value: `${s.mail.unread.toLocaleString('de-DE')} ungelesen`, tone: 'idle' });
  return chips;
}

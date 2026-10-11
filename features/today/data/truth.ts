import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';

export type SourceTruth = 'verified' | 'disconnected' | 'unavailable' | 'partial' | 'stale' | 'unknown';
export interface TodayCard { title: string; copy: string }

/**
 * One source can prove an empty state only when CORE confirms it is complete
 * and the observation is still inside its declared freshness window.
 */
export function sourceTruth(source: TodaySourceMeta, nowMs = Date.now()): SourceTruth {
  if (source.status === 'disconnected') return 'disconnected';
  if (source.status === 'unavailable') return 'unavailable';
  if (source.status === 'stale') return 'stale';
  if (source.status === 'partial' || !source.complete) return 'partial';
  if (source.status !== 'ok' && source.status !== 'empty') return 'unknown';
  const observedAt = Date.parse(source.as_of);
  if (!Number.isFinite(observedAt) || !Number.isFinite(source.stale_after_seconds) || source.stale_after_seconds <= 0) return 'unknown';
  if (observedAt > nowMs + 5 * 60_000 || nowMs - observedAt > source.stale_after_seconds * 1000) return 'stale';
  return 'verified';
}

const UNKNOWN: Record<Exclude<SourceTruth, 'verified'>, TodayCard> = {
  disconnected: { title: 'Nicht verbunden', copy: 'Quelle unter Einstellungen › Quellen verbinden.' },
  unavailable: { title: 'Nicht erreichbar', copy: 'CORE konnte die Quelle nicht lesen. Keine Entwarnung.' },
  partial: { title: 'Unvollständig', copy: 'Nicht alle Daten wurden bestätigt. Keine Entwarnung.' },
  stale: { title: 'Daten veraltet', copy: 'Der letzte bestätigte Stand ist nicht mehr aktuell.' },
  unknown: { title: 'Unbekannt', copy: 'Es liegt kein verifizierter aktueller Stand vor.' },
};

function whenUnknown(source: TodaySourceMeta, nowMs: number): TodayCard | null {
  const truth = sourceTruth(source, nowMs);
  return truth === 'verified' ? null : UNKNOWN[truth];
}

export function allSourcesVerified(snapshot: TodaySnapshot, nowMs = Date.now()): boolean {
  return (['mail', 'calendar', 'tasks', 'nightwatch'] as const).every((area) => sourceTruth(snapshot[area], nowMs) === 'verified');
}

export function todayCards(snapshot: TodaySnapshot, nowMs = Date.now()): Record<'calendar' | 'mail' | 'tasks' | 'nightwatch', TodayCard> {
  const calendar = whenUnknown(snapshot.calendar, nowMs) ?? (
    snapshot.calendar.count === 0
      ? { title: 'Keine Termine gemeldet', copy: 'Kalender wurde vollständig geprüft.' }
      : snapshot.calendar.count !== null && snapshot.calendar.count > 0
        ? {
          title: snapshot.calendar.events[0]?.title || String(snapshot.calendar.count) + ' Termine vorhanden',
          copy: String(snapshot.calendar.count) + ' Termin(e) von CORE gemeldet.',
        }
        : UNKNOWN.unknown
  );
  const mail = whenUnknown(snapshot.mail, nowMs) ?? (
    typeof snapshot.mail.inbox_loaded !== 'number' ? UNKNOWN.unknown : {
      title: snapshot.mail.items[0]?.subject || (snapshot.mail.inbox_loaded === 0 ? 'Keine Nachrichten geladen' : String(snapshot.mail.inbox_loaded) + ' Nachrichten geladen'),
      copy: String(snapshot.mail.inbox_loaded) + ' Nachrichten beim bestätigten Abruf geladen.',
    }
  );
  const tasks = whenUnknown(snapshot.tasks, nowMs) ?? (
    typeof snapshot.tasks.counts.open !== 'number' || typeof snapshot.tasks.counts.overdue !== 'number' ? UNKNOWN.unknown : {
      title: snapshot.tasks.counts.open === 0 ? 'Keine offenen Aufgaben' : String(snapshot.tasks.counts.open) + ' Aufgaben offen',
      copy: String(snapshot.tasks.counts.overdue) + ' überfällige Aufgaben laut CORE.',
    }
  );
  const nightwatch = whenUnknown(snapshot.nightwatch, nowMs) ?? (
    typeof snapshot.nightwatch.open_incidents !== 'number' ? UNKNOWN.unknown : {
      title: snapshot.nightwatch.open_incidents === 0 ? 'Keine offenen Vorfälle gemeldet' : String(snapshot.nightwatch.open_incidents) + ' offene Vorfälle',
      copy: 'Nightwatch-Stand laut CORE; keine Aussage über andere Sicherheitsquellen.',
    }
  );
  return { calendar, mail, tasks, nightwatch };
}

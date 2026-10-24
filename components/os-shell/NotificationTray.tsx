'use client';
import React, { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button, Stack, Status, Surface, Text } from '@/components/os-kit';
import { useOsNotifications } from '@/lib/os-prototype/notifications';
import { useWorld } from '@/lib/lea/useWorld';
import type { LiveDay } from '@/lib/lea/live';

/** Hinweise aus Leas echtem Tag: laufender oder liegengebliebener Termin, nächster Termin, überfällige Aufgaben. */
export function dayNotices(day: LiveDay): { id: string; title: string; body?: string; urgent: boolean }[] {
  const out: { id: string; title: string; body?: string; urgent: boolean }[] = [];
  if (day.running) out.push({ id: `run-${day.running.id}`, title: `Läuft: ${day.running.title}`, body: day.running.time, urgent: false });
  if (day.stale) out.push({ id: `stale-${day.stale.id}`, title: `Noch offen: ${day.stale.title}`, body: 'Termin vorbei, aber nicht abgeschlossen', urgent: true });
  if (day.next) out.push({ id: `next-${day.next.id}`, title: `Als Nächstes: ${day.next.title}`, body: day.minutesToNext != null ? `in ${day.minutesToNext} Min · ${day.next.time ?? ''}`.trim() : day.next.time, urgent: false });
  for (const t of day.open.filter((x) => x.overdue)) out.push({ id: `od-${t.task.id}`, title: t.task.title, body: t.meta, urgent: true });
  return out;
}

export function NotificationButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const unread = useOsNotifications((s) => s.items.filter((i) => !i.read).length) + dayNotices(useWorld().day).filter((n) => n.urgent).length;
  return (
    <Button variant="ghost" iconOnly aria-expanded={open} aria-label={unread ? `Hinweise (${unread} neu)` : 'Hinweise'} icon={<span className="relative"><Bell size={16} />{unread ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: 'var(--os-accent)' }} /> : null}</span>} onClick={onToggle} />
  );
}

export function NotificationTray({ onClose }: { onClose: () => void }) {
  const items = useOsNotifications((s) => s.items);
  const markAllRead = useOsNotifications((s) => s.markAllRead);
  const day = dayNotices(useWorld().day);
  const ref = useRef<HTMLDivElement>(null);
  // Schließt bei Escape und Klick daneben, damit das Panel nicht über anderen Flächen liegen bleibt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (ref.current && t && !ref.current.contains(t) && !t.closest('[aria-label^="Hinweise"],[aria-label="Mitteilungen"]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-4 top-14 z-[1200] w-[min(360px,calc(100vw-32px))]" data-testid="notification-tray">
    <Surface variant="strong" padding={4} aria-label="Hinweise" style={{ background: 'var(--os-canvas-raised)' }}>
      <Stack direction="row" justify="space-between" align="center">
        <Text variant="eyebrow">Hinweise</Text>
        <Stack direction="row" gap={1}>
          <Button size="sm" variant="ghost" onClick={markAllRead}>Gelesen</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Schließen</Button>
        </Stack>
      </Stack>
      {day.length ? (
        <div className="os-list mt-2" data-testid="tray-day">
          <Text variant="eyebrow" className="pt-2">Heute</Text>
          {day.map((n) => (
            <div key={n.id} className="os-list-row" style={{ alignItems: 'flex-start' }}>
              <div className="min-w-0"><Text variant="body" tone="default">{n.title}</Text>{n.body ? <Text variant="meta">{n.body}</Text> : null}</div>
              <Status tone={n.urgent ? 'warning' : 'neutral'}>{n.urgent ? 'überfällig' : 'Tag'}</Status>
            </div>
          ))}
        </div>
      ) : null}
      <div className="os-list mt-2">
        {items.length === 0 && !day.length ? <Text variant="meta" className="py-3">Keine Hinweise in dieser Sitzung.</Text> : items.length === 0 ? null : items.map((n) => (
          <div key={n.id} className="os-list-row" style={{ alignItems: 'flex-start' }}>
            <div className="min-w-0">
              <Text variant="body" tone="default">{n.title}</Text>
              {n.body ? <Text variant="meta">{n.body}</Text> : null}
            </div>
            <Status tone={n.tone === 'ai' ? 'ai' : n.tone}>{n.source}</Status>
          </div>
        ))}
      </div>
    </Surface>
    </div>
  );
}

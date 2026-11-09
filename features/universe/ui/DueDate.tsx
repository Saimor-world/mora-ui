'use client';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { localISO, shortDate } from '@/lib/lea/world';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const longFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const wdFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });

const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso: string, n: number) => { const d = parse(iso); d.setDate(d.getDate() + n); return localISO(d); };

/** Fälligkeit, wie das OS Daten zeigt („heute“, „morgen“, „Mi. 12.11.“) – nie mm/dd/yyyy. */
export function dueText(iso: string, today = localISO(new Date())): string {
  if (iso === today) return 'heute';
  if (iso === addDays(today, 1)) return 'morgen';
  return `${wdFmt.format(parse(iso))} ${shortDate(iso)}`;
}

/** Wochen eines Monats ab Montag; Tage außerhalb des Monats sind null. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(localISO(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * Deutscher Datumswähler für Fälligkeiten: ein ruhiger Knopf mit dem Datum, darüber ein kleiner Monat (Mo–So).
 * Liefert ISO (YYYY-MM-DD) an CORE, zeigt aber nur deutsches Format.
 */
export function DueDate({ value, onChange, clearable = false, testId }: {
  value: string | null;
  onChange: (iso: string | null) => void;
  /** true = löschbar; 'disabled' = „Ohne“ sichtbar aber deaktiviert (CORE ignoriert null bei TaskUpdate). */
  clearable?: boolean | 'disabled';
  testId?: string;
}) {
  const today = localISO(new Date());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const d = parse(value || today); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [pos, setPos] = useState<React.CSSProperties>({});
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const h = pop.current?.offsetHeight || 340, w = 284;
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w));
    // Immer nach oben öffnen: unten liegt das Dock.
    setPos({ left, top: Math.max(12, r.top - h - 8) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus(); } };
    const onDown = (e: PointerEvent) => { const t = e.target as Node; if (!pop.current?.contains(t) && !btn.current?.contains(t)) setOpen(false); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    requestAnimationFrame(() => pop.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"],[data-today]')?.focus());
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onDown, true); };
  }, [open]);

  const pick = (iso: string | null) => { onChange(iso); setOpen(false); btn.current?.focus(); };
  const shift = (n: number) => setView(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const overdue = Boolean(value && value < today);

  return (
    <>
      <button ref={btn} type="button" className="ws-due-btn" data-empty={value ? undefined : '1'} data-overdue={overdue ? '1' : undefined}
        aria-haspopup="dialog" aria-expanded={open} aria-label={value ? `Fällig ${longFmt.format(parse(value))}` : 'Fällig'}
        onClick={() => { if (!open) { const d = parse(value || today); setView({ y: d.getFullYear(), m: d.getMonth() }); } setOpen((o) => !o); }} data-testid={testId}>
        <CalendarDays size={14} aria-hidden />
        {value ? <span>{dueText(value, today)}</span> : null}
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div ref={pop} className="ws-cal" role="dialog" aria-label="Fällig" data-ws-pop style={pos} data-testid={testId ? `${testId}-cal` : undefined}>
          <div className="ws-cal__head">
            <button type="button" onClick={() => shift(-1)} aria-label="Vorheriger Monat"><ChevronLeft size={16} /></button>
            <b>{monthFmt.format(new Date(view.y, view.m, 1))}</b>
            <button type="button" onClick={() => shift(1)} aria-label="Nächster Monat"><ChevronRight size={16} /></button>
          </div>
          <div className="ws-cal__grid" role="grid">
            {WEEKDAYS.map((w) => <span key={w} className="ws-cal__wd" aria-hidden>{w}</span>)}
            {cells.map((iso, i) => iso ? (
              <button key={iso} type="button" aria-pressed={iso === value} data-today={iso === today ? '1' : undefined} data-past={iso < today ? '1' : undefined}
                aria-label={longFmt.format(parse(iso))} onClick={() => pick(iso)} data-iso={iso}>{Number(iso.slice(8))}</button>
            ) : <span key={`e${i}`} aria-hidden />)}
          </div>
          <div className="ws-cal__quick">
            <button type="button" onClick={() => pick(today)}>Heute</button>
            <button type="button" onClick={() => pick(addDays(today, 1))}>Morgen</button>
            <button type="button" onClick={() => pick(addDays(today, 7))}>In einer Woche</button>
            {clearable && value ? (
              clearable === 'disabled'
                ? <button type="button" disabled aria-disabled="true" title="Fälligkeit lässt sich hier nicht entfernen" aria-label="Ohne Fälligkeit (nicht verfügbar)">Ohne</button>
                : <button type="button" onClick={() => pick(null)} aria-label="Ohne Fälligkeit">Ohne</button>
            ) : null}
          </div>
        </div>, document.body) : null}
    </>
  );
}

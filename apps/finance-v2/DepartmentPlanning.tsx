'use client';

import React, { useMemo, useState } from 'react';
import { departmentScenario } from '@/lib/finance/departmentScenario';

export default function DepartmentPlanning() {
  const [treasury, setTreasury] = useState('3600');
  const [reserve, setReserve] = useState('');
  const [monthly, setMonthly] = useState('');
  const result = useMemo(() => departmentScenario(treasury, reserve, monthly), [treasury, reserve, monthly]);
  const fields = [
    { label: 'Treasury-Szenario in USD', value: treasury, change: setTreasury },
    { label: 'Geschützte Reserve in USD', value: reserve, change: setReserve },
    { label: 'Monatlicher Einsatz in USD', value: monthly, change: setMonthly },
  ];
  const messages = {
    incomplete: 'Reserve und Monatsbetrag ergänzen, um die Planung zu berechnen.',
    reserve_exceeds_treasury: 'Die Reserve übersteigt das angenommene Treasury.',
    budget_exceeds_capacity: 'Der Monatsbetrag übersteigt das Kapital außerhalb der Reserve.',
    scenario: 'Planung berechnet. Ein echtes Mandat benötigt belegte Finanzierung und Freigabe.',
  };
  return (
    <section aria-label="Finance-Abteilung planen" className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-white/85">Finance als Abteilung</h3>
        <span className="text-xs text-amber-200/80">Szenario · kein verfügbares Guthaben</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/55">Ab November 2026: monatlichen Kapitaleinsatz und Reserve planen. Auch ohne Kundenumsatz. Keine Kursgewinne oder neuen Einzahlungen angenommen.</p>
      <p className="mt-2 text-xs leading-relaxed text-white/65">Vorgesehene neue Finanzierung: 100 EUR pro Monat. Noch nicht eingezahlt. Bei RLUSD zählen tatsächlicher Eingang, Wechselkurs und Gebühren; 100 EUR sind nicht automatisch 100 RLUSD. Der Rechner darunter betrachtet nur das bestehende Treasury-Szenario.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {fields.map((field) => (
          <label key={field.label} className="grid gap-2 text-xs text-white/65">
            {field.label}
            <input inputMode="decimal" value={field.value} onChange={(event) => field.change(event.target.value)} placeholder="Noch nicht festgelegt" className="min-w-0 rounded-lg border border-white/15 bg-black/20 p-3 text-white focus-visible:outline focus-visible:outline-emerald-300" />
          </label>
        ))}
      </div>
      <div role="status" className="mt-4 text-xs leading-relaxed text-white/65">
        {messages[result.state]}
        {result.state === 'scenario' && result.fullMonths !== null && <p className="mt-2">{result.fullMonths.toString()} volle Monate, falls jeder Monatsbetrag vollständig verbraucht wird. Betriebskosten und zusätzliche Gebühren sind hier nicht enthalten.</p>}
        {result.state === 'scenario' && result.fullMonths === null && <p className="mt-2">Ohne positiven Monatsbetrag ist keine Laufzeit berechenbar.</p>}
      </div>
      <p className="mt-3 text-xs text-white/40">Diese Eingaben bleiben nur in dieser Ansicht und werden beim Schließen verworfen. Sie ändern weder Finanzbuch noch Budget.</p>
    </section>
  );
}

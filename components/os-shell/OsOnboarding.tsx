'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Command, LayoutGrid, Orbit, Plus, X } from 'lucide-react';
import { Button, Hint, Input, MoraStone, Stack, Text } from '@/components/os-kit';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { SCENES } from '@/lib/os-prototype/scene';
import { SourceDock } from '@/features/settings/ui/SourceDock';
import { finishOnboarding, isOnboardingDone, ONBOARDING_RESTART_EVENT, readLocalOrg, saveLocalOrg } from '@/lib/os-prototype/onboarding';

/**
 * V1.6 Ruhiges Onboarding (aus Legacy FirstRunTour/firstRunStore, überarbeitet):
 * vier kurze Schritte, jederzeit überspringbar, in Einstellungen wiederholbar.
 * 1 Look & Phase · 2 Firma/Abteilungen (nur lokal) · 3 Erste Station (V1.7 Andockstation) · 4 Tour Dock & Universe
 */
const STEPS = ['Darstellung', 'Deine Firma', 'Erste Station', 'Kurze Tour'] as const;

export function OsOnboarding({ live, navigate }: { live: boolean; navigate: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [org, setOrg] = useState(() => ({ company: '', departments: [] as string[] }));
  const [dept, setDept] = useState('');
  const look = useOsShellStore((s) => s.look);
  const override = useOsShellStore((s) => s.phaseOverride);
  const st = useOsShellStore.getState;

  useEffect(() => {
    if (!isOnboardingDone()) { setOrg(readLocalOrg()); setOpen(true); }
    const restart = () => { setOrg(readLocalOrg()); setStep(0); setOpen(true); };
    window.addEventListener(ONBOARDING_RESTART_EVENT, restart);
    return () => window.removeEventListener(ONBOARDING_RESTART_EVENT, restart);
  }, []);

  // Tour-Schritt: Dock dezent hervorheben.
  useEffect(() => {
    const dock = document.querySelector('[data-testid="os-dock"]');
    if (open && step === 3) dock?.setAttribute('data-tour-spot', '');
    return () => dock?.removeAttribute('data-tour-spot');
  }, [open, step]);

  const close = useCallback(() => { saveLocalOrg(org); finishOnboarding(); setOpen(false); }, [org]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  const addDept = () => { const d = dept.trim(); if (d && !org.departments.includes(d) && org.departments.length < 12) setOrg((o) => ({ ...o, departments: [...o.departments, d] })); setDept(''); };

  return (
    <div className="os-dialog-backdrop os-onboarding-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="ob-title" className="os-dialog os-onboarding" data-testid="onboarding" data-step={step}>
        <Stack direction="row" align="center" justify="space-between">
          <Stack direction="row" gap={2} align="center"><MoraStone size={22} /><Text variant="eyebrow">Willkommen · Schritt {step + 1} von {STEPS.length}</Text></Stack>
          <button type="button" className="os-onboarding__skip" onClick={close} data-testid="onboarding-skip">Überspringen <X size={13} aria-hidden /></button>
        </Stack>
        <ol className="os-onboarding__steps" aria-label="Fortschritt">
          {STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined} data-done={i < step || undefined}>{s}</li>)}
        </ol>
        <Text variant="title" as="h2" id="ob-title" className="mt-4">{['Wie soll SAIMÔR aussehen?', 'Wie heißt deine Firma?', 'Erste Station andocken', 'So findest du dich zurecht'][step]}</Text>

        <div className="os-onboarding__body mt-3">
          {step === 0 ? (
            <>
              <Text variant="meta">Später jederzeit in Einstellungen › Darstellung änderbar.</Text>
              <div className="os-look-grid mt-3">
                {([['kosmos', 'Kosmos', 'Raum, Licht und Tagesphasen.'], ['klar', 'Klar', 'Ruhige Business-Ansicht, gleiche Funktionen.']] as const).map(([id, t, d]) => (
                  <button key={id} type="button" className="os-look-card" aria-pressed={look === id} onClick={() => st().setLook(id)} data-testid={`ob-look-${id}`}>
                    <span className={`os-look-card__swatch os-look-card__swatch--${id}`} aria-hidden /><b>{t}</b><span>{d}</span>
                  </button>
                ))}
              </div>
              <div className="os-phase-row mt-3" role="group" aria-label="Tagesphase">
                <button type="button" aria-pressed={!override} onClick={() => st().setPhaseOverride(null)} data-testid="ob-phase-auto"><b>Automatisch</b><span>nach Uhrzeit</span></button>
                {SCENES.map((s) => <button key={s.id} type="button" aria-pressed={override === s.id} onClick={() => st().setPhaseOverride(s.id)} data-testid={`ob-phase-${s.id}`}><b>{s.label}</b><span>{s.range}</span></button>)}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <Stack gap={3}>
              <Input label="Firmenname" hideLabel={false} value={org.company} maxLength={80} placeholder="z. B. Muster GmbH" onChange={(e) => setOrg((o) => ({ ...o, company: e.target.value }))} data-testid="ob-company" />
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); addDept(); }}>
                <Input label="Abteilung hinzufügen" hideLabel={false} value={dept} maxLength={40} placeholder="z. B. Vertrieb" onChange={(e) => setDept(e.target.value)} data-testid="ob-dept" />
                <Button size="sm" type="submit" icon={<Plus size={13} />} data-testid="ob-dept-add">Hinzufügen</Button>
              </form>
              {org.departments.length ? (
                <div className="os-chip-row" data-testid="ob-depts">{org.departments.map((d) => (
                  <span key={d} className="os-chip">{d}<button type="button" aria-label={`${d} entfernen`} onClick={() => setOrg((o) => ({ ...o, departments: o.departments.filter((x) => x !== d) }))}><X size={11} /></button></span>
                ))}</div>
              ) : null}
              <Hint>Bleibt nur in diesem Browser gespeichert – es wird nichts an CORE gesendet. Echte Abteilungen legst du später im Universe an.</Hint>
            </Stack>
          ) : null}

          {step === 2 ? (
            <div data-testid="ob-sources">
              <SourceDock live={live} compact navigate={(id) => { close(); navigate(id); }} />
            </div>
          ) : null}

          {step === 3 ? (
            <Stack gap={2} data-testid="ob-tour">
              <Hint tone="insight"><b>Dock (unten):</b> alle Bereiche – Heute, Post, Finanzen, Wissen. Der Stein rechts öffnet MÔRA.</Hint>
              <Hint><Orbit size={12} className="inline" aria-hidden /> <b>Universe:</b> deine Abteilungen als Kugeln. Klicke eine an, um Dokumente, Signale und den nächsten Schritt zu sehen.</Hint>
              <Hint><Command size={12} className="inline" aria-hidden /> <b>⌘K</b> sucht überall, <b>?</b> zeigt alle Kürzel, <LayoutGrid size={12} className="inline" aria-hidden /> öffnet die klassische Oberfläche.</Hint>
            </Stack>
          ) : null}
        </div>

        <Stack direction="row" justify="space-between" align="center" className="mt-6">
          <Button size="sm" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Zurück</Button>
          {step < STEPS.length - 1
            ? <Button size="sm" onClick={() => { if (step === 1) saveLocalOrg(org); setStep((s) => s + 1); }} data-testid="onboarding-next">Weiter</Button>
            : <Button size="sm" onClick={() => { close(); navigate('universe'); }} data-testid="onboarding-finish">Zum Universe</Button>}
        </Stack>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '@/store/session';
import { emitMoraEvent } from '@/lib/mora/listener';

const STEPS = [
  {
    title: 'Willkommen bei Môra',
    text: 'Dies ist dein Raum der Klarheit. Ich zeige dir gleich, wie sich deine Daten verbinden.',
  },
  {
    title: 'Verbinde deine Quellen',
    text: 'E-Mail, Dateien, Workflows – alles wächst in denselben Resonanzraum hinein.',
  },
  {
    title: 'Navigiere mit Quick Actions',
    text: 'Folder, Field und Insights sind nur einen Atemzug entfernt. Ich halte den Kontext.',
  },
  {
    title: 'Fertig',
    text: 'Du kannst dieses Tutorial jederzeit wieder öffnen. Lass uns beginnen.',
  },
];

interface OnboardingOverlayProps {
  enableSelectorHints?: boolean;
}

export default function OnboardingOverlay({ enableSelectorHints = false }: OnboardingOverlayProps) {
  const { introSeen, setIntroSeen } = useSessionStore();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusSelectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    if (!introSeen) {
      setVisible(true);
    }
  }, [introSeen]);

  const handleSkip = useCallback(() => {
    setVisible(false);
    setIntroSeen(true);
    emitMoraEvent('intro_complete');
  }, [setIntroSeen]);

  const handleNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      handleSkip();
    } else {
      setStep((prev) => prev + 1);
    }
  }, [handleSkip, step]);

  useEffect(() => {
    if (!visible) return;
    const modal = overlayRef.current;
    if (!modal) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusFirst = () => {
      const focusable = modal.querySelectorAll<HTMLElement>(focusSelectors);
      focusable[0]?.focus();
    };

    focusFirst();

    const handleTrap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleSkip();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = modal.querySelectorAll<HTMLElement>(focusSelectors);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTrap);
    return () => {
      document.removeEventListener('keydown', handleTrap);
      previousFocusRef.current?.focus();
    };
  }, [handleSkip, visible, step]);

  if (!visible) return null;

  const current = STEPS[step];

  const titleId = 'mora-onboarding-title';
  const descriptionId = 'mora-onboarding-description';

  return (
    <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        {enableSelectorHints && (
          <div className="absolute left-4 top-24 w-48 h-32 border border-primary/40 rounded-3xl mora-glow" />
        )}
      </div>

      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative max-w-lg w-full bg-card border border-border rounded-3xl shadow-2xl p-8 text-center"
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground"
        >
          Überspringen
        </button>
        <div className="text-4xl mb-4 mora-breathe">🌿</div>
        <h2 id={titleId} className="text-xl font-medium mb-2">
          {current.title}
        </h2>
        <p id={descriptionId} className="text-sm text-muted-foreground mb-6">
          {current.text}
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === step ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold mora-transition"
        >
          {step === STEPS.length - 1 ? 'Los gehts' : 'Weiter'}
        </button>
      </div>
    </div>
  );
}

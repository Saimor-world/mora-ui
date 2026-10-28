'use client';
import React, { useEffect, useState } from 'react';
import { Home, Mic, Orbit } from 'lucide-react';
import { PixelMoraMark } from '@/components/world/PixelMora';
import '../cockpit.css';

export interface BridgeConsoleProps {
  home: boolean;
  onHome: () => void;
  onCompany: () => void;
  companyLabel?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMic: () => void;
  micLabel: string;
  needs: number;
  onNeeds: () => void;
  guidance?: { text: string; onOpen: () => void };
}

/** Exactly one MÔRA seated in the captain console center: Desktop 76px, iPad 68px, Mobile 56px. */
export function BridgeConsole({
  home,
  onHome,
  onCompany,
  companyLabel = 'Firma',
  value,
  onChange,
  onSubmit,
  onMic,
  micLabel,
  needs,
  onNeeds,
  guidance,
}: BridgeConsoleProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'phone'>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w <= 820) setDevice('phone');
      else if (w <= 1100) setDevice('tablet');
      else setDevice('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const moraSize = device === 'phone' ? 56 : device === 'tablet' ? 68 : 76;

  return (
    <nav className="ck-dock" aria-label="Kommandozentrale">
      <button
        type="button"
        className="ck-dock__b"
        aria-label="Home"
        aria-pressed={home}
        onClick={onHome}
        data-testid="dock-home"
      >
        <Home size={18} />
        <span>Home</span>
      </button>
      <button
        type="button"
        className="ck-dock__b"
        aria-label={companyLabel}
        aria-pressed={!home}
        onClick={onCompany}
        data-testid="open-firma"
      >
        <Orbit size={18} />
        <span>{companyLabel}</span>
      </button>
      <div className="ck-captain" data-testid="captain-place">
        <PixelMoraMark size={moraSize} />
        <div className="ck-captain__line">
          {guidance ? (
            <button type="button" onClick={guidance.onOpen}>
              {guidance.text}
            </button>
          ) : (
            <span>Was jetzt wichtig ist</span>
          )}
        </div>
      </div>
      <form
        className="ck-ask"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          aria-label="Frag MÔRA"
          placeholder="Frag MÔRA …"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid="ck-ask"
        />
        <button type="button" className="ck-mic" aria-label={micLabel} onClick={onMic}>
          <Mic size={18} />
        </button>
      </form>
      {needs > 0 ? (
        <button type="button" className="ck-dock__need" onClick={onNeeds}>
          {needs} für dich
        </button>
      ) : null}
    </nav>
  );
}

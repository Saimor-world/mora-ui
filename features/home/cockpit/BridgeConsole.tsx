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
/** One character, one reserved seat. Never part of the input's flex layout. */
export function BridgeConsole({ home, onHome, onCompany, companyLabel = 'Firma', value, onChange, onSubmit, onMic, micLabel, needs, onNeeds, guidance }: BridgeConsoleProps) {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const media = matchMedia('(max-width:820px)');
    const update = () => setPhone(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <nav className="ck-dock" aria-label="Kommandozentrale">
    <button type="button" className="ck-dock__b" aria-label="Home" aria-pressed={home} onClick={onHome} data-testid="dock-home"><Home size={18}/><span>Home</span></button>
    <button type="button" className="ck-dock__b" aria-label={companyLabel} aria-pressed={!home} onClick={onCompany} data-testid="open-firma"><Orbit size={18}/><span>{companyLabel}</span></button>
    <div className="ck-captain" data-testid="captain-place"><PixelMoraMark size={phone ? 56 : 72}/><div className="ck-captain__line">{guidance ? <button type="button" onClick={guidance.onOpen}>{guidance.text}</button> : <span>Was jetzt wichtig ist</span>}</div></div>
    <form className="ck-ask" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
      <input aria-label="Frag MÔRA" placeholder="Frag MÔRA …" value={value} onChange={e => onChange(e.target.value)} data-testid="ck-ask"/>
      <button type="button" className="ck-mic" aria-label={micLabel} onClick={onMic}><Mic size={18}/></button>
    </form>
    {needs > 0 ? <button type="button" className="ck-dock__need" onClick={onNeeds}>{needs} für dich</button> : null}
  </nav>;
}

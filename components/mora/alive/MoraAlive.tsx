'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { CHARACTER_LABEL, CHARACTER_STATES, type CharacterState } from '@/lib/mora/alive/engine';
import { useCharacter } from '@/lib/mora/alive/useCharacter';
import styles from './MoraAlive.module.css';
const Scene = dynamic(() => import('./CharacterScene'), { ssr: false, loading: () => <p className={styles.loading}>Lichtkörper wird geladen …</p> });
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
/** Shared public renderer + read-only OS adapter. Public previews never connect to CORE. */
export default function MoraAlive({ live = false, compact = false }: { live?: boolean; compact?: boolean }) {
  const actual = useCharacter(live);
  const [preview, setPreview] = useState<CharacterState | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLElement>(null);
  const interaction = useRef({ x: 0, y: 0, touchedAt: -Infinity });
  const snapshot = preview ? { state: preview, source: 'preview' as const } : actual;
  const still = paused || reduced;
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(query.matches); changed(); query.addEventListener('change', changed);
    const visibility = () => setPageVisible(document.visibilityState === 'visible'); visibility();
    document.addEventListener('visibilitychange', visibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer?.observe(root.current);
    return () => { query.removeEventListener('change', changed); document.removeEventListener('visibilitychange', visibility); observer?.disconnect(); };
  }, []);
  const fallback = <div className={styles.fallback}><p>3D ist hier nicht verfügbar.</p><p>MÔRAs Zustand bleibt lesbar. Du kannst die Ansicht neu laden.</p></div>;
  return <section ref={root} className={`${styles.alive} ${compact ? styles.compact : ''}`} aria-label="MÔRA Alive Vorschau" data-character-state={snapshot.state} data-character-source={snapshot.source}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>SAIMÔR / MÔRA ALIVE · V01</span><h1>Ein Licht. Ein Gegenüber.</h1></div>
      <Image src="/brand/saimor-sigil-restored-v1.webp" width={64} height={64} alt="Freigegebenes SAIMÔR-Sigil" className={styles.sigil} />
    </header>
    <div className={styles.stage} data-testid="mora-alive-stage" onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      interaction.current.x = (event.clientX - rect.left) / rect.width * 2 - 1;
      interaction.current.y = 1 - (event.clientY - rect.top) / rect.height * 2;
    }} onPointerDown={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      interaction.current = { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: 1 - (event.clientY - rect.top) / rect.height * 2, touchedAt: performance.now() };
    }}>
      <div className={styles.aura} aria-hidden="true" />
      <div className={styles.canvas} aria-hidden="true"><SceneBoundary fallback={fallback}>
        {failed ? fallback : <Scene state={snapshot.state} still={still} active={visible && pageVisible} interaction={interaction} onFailure={() => setFailed(true)} />}
      </SceneBoundary></div>
      <div className={styles.stageCaption}><span>LICHTKÖRPER 01</span><span>GOLD · JADE · RESONANZ</span></div>
    </div>
    <div className={styles.readout}>
      <div><p className={styles.eyebrow}>{snapshot.source === 'core' ? 'CORE-EREIGNIS' : snapshot.source === 'preview' ? 'CHARACTER-VORSCHAU' : snapshot.source === 'connection' ? 'VERBINDUNG' : 'OS-INTERAKTION'}</p>
        <p role="status" aria-live="polite" className={styles.status}>{CHARACTER_LABEL[snapshot.state]}</p></div>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Bewegung fortsetzen' : 'Bewegung pausieren'}</button>
    </div>
    <p className={styles.hint}>{reduced ? 'Reduzierte Bewegung aktiv. Der Körper bleibt still.' : 'Bewege den Zeiger. Tippe in den Raum oder lade MÔRA zu dir ein.'}</p>
    <div className={styles.controls}>
      <button type="button" onClick={() => { interaction.current = { x: 0.8, y: 0.3, touchedAt: performance.now() }; }}>Zu mir</button>
      <label>Ausdruck ansehen<select aria-label="Character-Vorschau" value={preview ?? ''} onChange={e => setPreview(e.target.value ? e.target.value as CharacterState : null)}>
        <option value="">{live ? 'OS-Ereignissen folgen' : 'Eigenständig schweben'}</option>
        {CHARACTER_STATES.map(state => <option key={state} value={state}>{CHARACTER_LABEL[state]} · Vorschau</option>)}
      </select></label>
    </div>
    <p className={styles.truth}>{live && !preview ? 'Liest den vorhandenen OS-Ereigniskanal. Ohne Verbindung wird keine Aktivität behauptet.' : 'Interaktiver Körperprototyp. Ausgewählte Ausdrücke sind Vorschau; es werden keine Agentenaufträge ausgeführt.'}</p>
    {!compact && <footer className={styles.footer}><span>Der S-Schweif folgt der Form des freigegebenen Sigils.</span><a href="/home">Zum SAIMÔR OS ↗</a></footer>}
  </section>;
}

'use client';
import { useCharacter } from '@/lib/mora/alive/useCharacter';
import MoraAliveView from './MoraAliveView';

/** Existing OS event adapter; the shared View also runs without OS dependencies. */
export default function MoraAlive({ live = false, compact = false }: { live?: boolean; compact?: boolean }) {
  const actual = useCharacter(live);
  return <MoraAliveView actual={actual} live={live} compact={compact} />;
}

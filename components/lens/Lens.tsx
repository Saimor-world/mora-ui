'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/contexts';
import OrbFilter from './OrbFilter';
import { useMindloopSynthesis } from '@/lib/hooks/useMindloopSynthesis';
import { computeActions } from '@/lib/mind/actions';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/folder', label: 'Folder Mode', icon: '🗂' },
  { href: '/field', label: 'Field Mode', icon: '🌐' },
  { href: '/insights', label: 'Insights', icon: '💡' },
];

export default function Lens() {
  const { mode, setMode, orb, setOrb } = useAppContext();
  const { items: synthesisItems } = useMindloopSynthesis();
  const actions = computeActions(synthesisItems || []);
  const hasRisk = actions.some((a) => a.kind === 'risk');
  const router = useRouter();
  const pathname = usePathname();
  const shortcutPendingRef = useRef(false);
  const shortcutTimerRef = useRef<number | null>(null);

  const handleModeChange = (nextMode: 'folder' | 'field') => {
    setMode(nextMode);
    router.push(nextMode === 'folder' ? '/folder' : '/field');
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (!shortcutPendingRef.current && event.key.toLowerCase() === 'g') {
        shortcutPendingRef.current = true;
        shortcutTimerRef.current = window.setTimeout(() => {
          shortcutPendingRef.current = false;
          shortcutTimerRef.current = null;
        }, 1000);
        return;
      }
      if (shortcutPendingRef.current) {
        const key = event.key.toLowerCase();
        shortcutPendingRef.current = false;
        if (shortcutTimerRef.current) {
          window.clearTimeout(shortcutTimerRef.current);
          shortcutTimerRef.current = null;
        }
        if (key === 'h') {
          router.push('/');
        } else if (key === 'f') {
          router.push('/folder');
        } else if (key === 'd') {
          window.dispatchEvent(new CustomEvent('mora:diagnostics-open'));
        } else if (key === 'i') {
          router.push('/insights');
        }
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (shortcutTimerRef.current) {
        window.clearTimeout(shortcutTimerRef.current);
        shortcutTimerRef.current = null;
      }
    };
  }, [router]);

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Mode Switcher */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          View Mode
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('folder')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'folder'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            📁 Folder
          </button>
          <button
            onClick={() => handleModeChange('field')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'field'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            🌐 Field
          </button>
        </div>
      </div>

      {/* Orb Filter */}
      <OrbFilter selected={orb} onChange={setOrb} hasActions={actions.length > 0} hasRisk={hasRisk} />

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Navigation
        </h3>
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Môra UI v0.1
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Shortcuts: g h / g f / g d / g i
        </p>
      </div>
    </aside>
  );
}

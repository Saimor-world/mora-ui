'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { MoraObject } from './types';
import { useSessionStore } from '@/store/session';
import { emitMoraEvent } from '@/lib/mora/listener';

type ViewMode = 'folder' | 'field';
export type OrbSelection = 'all' | 'leitung' | 'service' | 'hr';

interface AppContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  selectedObject: MoraObject | null;
  setSelectedObject: (obj: MoraObject | null) => void;
  orb: OrbSelection;
  setOrb: (orb: OrbSelection) => void;
  activeTagFilter: string | null;
  setActiveTagFilter: (tag: string | null) => void;
}

interface AppProviderProps {
  children: ReactNode;
  initialMode?: ViewMode;
}

function isValidOrb(value: string | null): value is OrbSelection {
  return value === 'leitung' || value === 'service' || value === 'hr' || value === 'all';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, initialMode = 'field' }: AppProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    activeOrb: storedOrb,
    setActiveOrb: persistOrb,
    setLastViewedNode,
  } = useSessionStore();

  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [selectedObject, setSelectedObject] = useState<MoraObject | null>(null);
  const [orb, setOrbState] = useState<OrbSelection>(storedOrb ?? 'all');
  const [activeTagFilter, setActiveTagFilterState] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const updateQuery = useCallback(
    (nextOrb: OrbSelection, nextTag: string | null) => {
      const entries = searchParams ? Array.from(searchParams.entries()) : [];
      const params = new URLSearchParams(entries);

      if (nextOrb && nextOrb !== 'all') {
        params.set('orb', nextOrb);
      } else {
        params.delete('orb');
      }

      if (nextTag) {
        params.set('tag', nextTag);
      } else {
        params.delete('tag');
      }

      const query = params.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const urlOrb = searchParams?.get('orb');
    if (isValidOrb(urlOrb) && urlOrb !== orb) {
      setOrbState(urlOrb);
      persistOrb(urlOrb);
    } else if (!urlOrb && orb !== 'all') {
      setOrbState('all');
      persistOrb('all');
    }

    const urlTag = searchParams?.get('tag');
    if (urlTag !== null && urlTag !== activeTagFilter) {
      setActiveTagFilterState(urlTag);
    }
    if (urlTag === null && activeTagFilter !== null) {
      setActiveTagFilterState(null);
    }
  }, [searchParams, orb, activeTagFilter, persistOrb]);

  const setOrb = useCallback(
    (value: OrbSelection) => {
      setOrbState(value);
      persistOrb(value);
      updateQuery(value, activeTagFilter);
    },
    [activeTagFilter, updateQuery, persistOrb]
  );

  const setActiveTagFilter = useCallback(
    (tag: string | null) => {
      if (tag) {
        emitMoraEvent('filter_change', { tag });
      }
      setActiveTagFilterState(tag);
      updateQuery(orb, tag);
    },
    [orb, updateQuery]
  );

  const handleSelectObject = useCallback(
    (obj: MoraObject | null) => {
      setSelectedObject(obj);
      setLastViewedNode(obj ?? null);
    },
    [setLastViewedNode]
  );

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        selectedObject,
        setSelectedObject: handleSelectObject,
        orb,
        setOrb,
        activeTagFilter,
        setActiveTagFilter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

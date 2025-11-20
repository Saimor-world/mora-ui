'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { MoraObject } from './types';
import { useSessionStore } from '@/store/session';
import { emitMoraEvent } from '@/lib/mora/listener';
import { ROLE_DEFINITIONS, type RoleKey } from '@/lib/roles';
import { useShallow } from 'zustand/react/shallow';
import { useMyceliumSelection, mapObjectToNode } from '@/lib/mycelium/selection';

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
  spaceId?: string;
}

interface AppProviderProps {
  children: ReactNode;
  initialMode?: ViewMode;
  spaceId?: string;
}

function isValidOrb(value: string | null): value is OrbSelection {
  return value === 'leitung' || value === 'service' || value === 'hr' || value === 'all';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, initialMode = 'field', spaceId }: AppProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { activeOrb: storedOrb, setActiveOrb: persistOrb, setLastViewedNode } = useSessionStore(
    useShallow((state) => ({
      activeOrb: state.activeOrb,
      setActiveOrb: state.setActiveOrb,
      setLastViewedNode: state.setLastViewedNode,
    }))
  );
  const activeRole = useSessionStore((state) => state.activeRole);
  const { selection, setSelection, clearSelection } = useMyceliumSelection();

  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [orb, setOrbState] = useState<OrbSelection>(storedOrb ?? 'all');
  const [activeTagFilter, setActiveTagFilterState] = useState<string | null>(null);
  const roleAppliedRef = useRef<RoleKey | null>(null);

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
      if (obj) {
        setSelection({ kind: 'node', node: mapObjectToNode(obj), object: obj });
        setLastViewedNode(obj);
      } else {
        clearSelection();
        setLastViewedNode(null);
      }
    },
    [setSelection, clearSelection, setLastViewedNode]
  );

  const selectedObject = selection.kind === 'node' ? selection.object ?? null : null;

  useEffect(() => {
    if (!activeRole) return;
    const definition = ROLE_DEFINITIONS[activeRole];
    if (!definition) return;

    const roleChanged = roleAppliedRef.current !== activeRole;
    if (roleChanged) {
      roleAppliedRef.current = activeRole;
    }

    if (roleChanged && definition.orbDefault && definition.orbDefault !== orb) {
      setOrb(definition.orbDefault as OrbSelection);
    }

    const targetTag = definition.tagDefault ?? null;
    if (roleChanged) {
      if (targetTag !== null) {
        if (activeTagFilter !== targetTag) {
          setActiveTagFilter(targetTag);
        }
      } else if (activeTagFilter) {
        setActiveTagFilter(null);
      }
    }
  }, [activeRole, orb, activeTagFilter, setOrb, setActiveTagFilter]);

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
        spaceId,
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

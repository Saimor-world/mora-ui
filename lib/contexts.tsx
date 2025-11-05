'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { MoraObject } from './types';

type ViewMode = 'folder' | 'field';

interface AppContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  selectedObject: MoraObject | null;
  setSelectedObject: (obj: MoraObject | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>('folder');
  const [selectedObject, setSelectedObject] = useState<MoraObject | null>(null);

  return (
    <AppContext.Provider value={{ mode, setMode, selectedObject, setSelectedObject }}>
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

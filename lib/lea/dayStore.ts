'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Status eines Termins im Laufe des Tages („Michelle ist da“, „abgeschlossen“).
 * CORE kennt für Kalendertermine keinen Status – deshalb nur auf diesem Gerät gespeichert
 * (localStorage), je Termin-ID. Nichts wird erfunden: ohne Klick bleibt ein Termin „geplant“.
 */
export type EventPhase = 'geplant' | 'laeuft' | 'erledigt';

interface DayState {
  phases: Record<string, EventPhase>;
  setPhase(eventId: string, phase: EventPhase): void;
}

export const useDayStore = create<DayState>()(
  persist(
    (set) => ({
      phases: {},
      setPhase: (eventId, phase) => set((s) => ({ phases: { ...s.phases, [eventId]: phase } })),
    }),
    { name: 'saimor-day-phases-v1' },
  ),
);

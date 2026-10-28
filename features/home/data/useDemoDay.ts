'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { act, initialDay, type DemoAction, type DemoDay } from './demoDay';

/** Vorführtag im Browser gespeichert: wer als Marius freigibt, sieht es danach als Lena oder Jonas. */
export const useDemoDay = create<{ day: DemoDay; dispatch: (a: DemoAction) => void }>()(
  persist((set) => ({ day: initialDay(), dispatch: (a) => set((s) => ({ day: act(s.day, a) })) }), { name: 'saimor-demo-morgenrot-v1' }),
);

"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type MoraEventAction =
  | "node_click"
  | "node_hover"
  | "node_open"
  | "orb_change"
  | "filter_change"
  | "tag_filter_change"
  | "timeline_change"
  | "quick_action"
  | "intro_complete"
  | "view_change"
  | "connector_action"
  | "open_document";

export interface MoraEvent<T = Record<string, unknown>> {
  ts: number;
  action: MoraEventAction;
  payload?: T;
}

interface ListenerState {
  events: MoraEvent[];
  lastEvent: MoraEvent | null;
  addEvent: (event: MoraEvent) => void;
  clear: () => void;
}

const MAX_EVENTS = 200;
const GLOBAL_KEY = "__mora_events";
type SessionRecorder = (event: MoraEvent) => void;
let sessionRecorder: SessionRecorder | null = null;

function readGlobalEvents(): MoraEvent[] {
  if (typeof window === "undefined") return [];
  const existing = (window as any)[GLOBAL_KEY];
  if (Array.isArray(existing)) {
    return existing;
  }
  (window as any)[GLOBAL_KEY] = [];
  return [];
}

function writeGlobalEvent(event: MoraEvent) {
  if (typeof window === "undefined") return;
  const store = readGlobalEvents();
  store.push(event);
  if (store.length > MAX_EVENTS) {
    store.splice(0, store.length - MAX_EVENTS);
  }
  (window as any)[GLOBAL_KEY] = store;
}

export const useMoraListenerStore = create<ListenerState>()(
  immer((set) => ({
    events: typeof window !== "undefined" ? readGlobalEvents() : [],
    lastEvent: null,
    addEvent: (event: MoraEvent) =>
      set((state) => {
        state.events.push(event);
        if (state.events.length > MAX_EVENTS) {
          state.events.shift();
        }
        state.lastEvent = event;
      }),
    clear: () =>
      set((state) => {
        state.events = [];
        state.lastEvent = null;
      }),
  }))
);

export function emitMoraEvent(action: MoraEventAction, payload?: Record<string, unknown>) {
  const event: MoraEvent = {
    ts: Date.now(),
    action,
    payload,
  };

  writeGlobalEvent(event);
  useMoraListenerStore.getState().addEvent(event);
  sessionRecorder?.(event);

  if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
    if (typeof console.groupCollapsed === 'function') {
      console.groupCollapsed(`🧠 Môra Awareness | ${action}`);
      console.log('payload', payload ?? null);
      console.groupEnd();
    } else {
      console.log('🧠 Môra Awareness', action, payload ?? null);
    }
  }
}

export function getMoraEvents(): MoraEvent[] {
  const local = useMoraListenerStore.getState().events;
  if (local.length > 0) {
    return local;
  }
  return readGlobalEvents();
}

export function useMoraAwareness() {
  const { lastEvent, events, clear } = useMoraListenerStore();
  return {
    lastEvent,
    events,
    emit: emitMoraEvent,
    clear,
  };
}

export function registerSessionRecorder(recorder: SessionRecorder) {
  sessionRecorder = recorder;
}

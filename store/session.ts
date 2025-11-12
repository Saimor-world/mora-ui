"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MoraObject } from "@/lib/types";
import type { OrbSelection } from "@/lib/contexts";
import { emitMoraEvent, registerSessionRecorder } from "@/lib/mora/listener";
import type { MoraEvent, MoraEventAction } from "@/lib/mora/listener";

const RECENT_EVENT_LIMIT = 50;
const RECENT_EVENT_TYPES: MoraEventAction[] = [
  "node_click",
  "connector_action",
  "filter_change",
  "tag_filter_change",
];

interface SessionState {
  activeOrb: OrbSelection;
  lastViewedNode: Pick<MoraObject, "id" | "title" | "type" | "tags"> | null;
  introSeen: boolean;
  lastSnapshotId: string | null;
  setActiveOrb: (orb: OrbSelection) => void;
  setLastViewedNode: (node: MoraObject | null) => void;
  setIntroSeen: (seen: boolean) => void;
  setLastSnapshotId: (snapshotId: string | null) => void;
  recentEvents: MoraEvent[];
  appendRecentEvent: (event: MoraEvent) => void;
  clearRecentEvents: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeOrb: "all",
      lastViewedNode: null,
      introSeen: false,
      lastSnapshotId: null,
      recentEvents: [],
      setActiveOrb: (orb) => {
        emitMoraEvent("orb_change", { orb });
        set({ activeOrb: orb });
      },
      setLastViewedNode: (node) => {
        if (node) {
          emitMoraEvent("node_open", { id: node.id, type: node.type, tags: node.tags });
          set({
            lastViewedNode: {
              id: node.id,
              title: node.title,
              type: node.type,
              tags: node.tags,
            },
          });
        } else {
          set({ lastViewedNode: null });
        }
      },
      setIntroSeen: (seen) => {
        if (seen) {
          emitMoraEvent("intro_complete");
        }
        set({ introSeen: seen });
      },
      setLastSnapshotId: (snapshotId) => {
        if (snapshotId) {
          emitMoraEvent("timeline_change", { snapshotId });
        }
        set({ lastSnapshotId: snapshotId });
      },
      appendRecentEvent: (event) => {
        if (!RECENT_EVENT_TYPES.includes(event.action)) {
          return;
        }
        set((state) => {
          const next = [...state.recentEvents, event].slice(-RECENT_EVENT_LIMIT);
          return { recentEvents: next };
        });
      },
      clearRecentEvents: () => {
        set({ recentEvents: [] });
      },
    }),
    {
      name: "mora_session_store",
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as SessionState;
        }
        const nextState = { ...persistedState } as SessionState;
        if (version < 2 || !Array.isArray((persistedState as Record<string, unknown>).recentEvents)) {
          nextState.recentEvents = [];
        }
        return nextState;
      },
    }
  )
);

if (typeof window !== "undefined") {
  registerSessionRecorder((event) => {
    useSessionStore.getState().appendRecentEvent(event);
  });
}

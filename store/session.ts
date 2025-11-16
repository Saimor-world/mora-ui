"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MoraObject } from "@/lib/types";
import type { OrbSelection } from "@/lib/contexts";
import type { RoleKey } from "@/lib/roles";
import { emitMoraEvent, registerSessionRecorder } from "@/lib/mora/listener";
import type { MoraEvent, MoraEventAction } from "@/lib/mora/listener";
import type { MyceliumSelection } from "@/lib/mycelium/selection";

const RECENT_EVENT_LIMIT = 50;
const RECENT_EVENT_TYPES: MoraEventAction[] = [
  "node_click",
  "connector_action",
  "filter_change",
  "tag_filter_change",
];

interface FavoriteEntry {
  id: string;
  title?: string;
  path?: string;
  tags?: string[];
}

interface SessionState {
  activeOrb: OrbSelection;
  activeRole: RoleKey;
  lastViewedNode: Pick<MoraObject, "id" | "title" | "type" | "tags"> | null;
  myceliumSelection: MyceliumSelection;
  introSeen: boolean;
  lastSnapshotId: string | null;
  setActiveOrb: (orb: OrbSelection) => void;
  setActiveRole: (role: RoleKey) => void;
  setLastViewedNode: (node: MoraObject | null) => void;
  setMyceliumSelection: (selection: MyceliumSelection) => void;
  clearMyceliumSelection: () => void;
  setIntroSeen: (seen: boolean) => void;
  setLastSnapshotId: (snapshotId: string | null) => void;
  recentEvents: MoraEvent[];
  appendRecentEvent: (event: MoraEvent) => void;
  clearRecentEvents: () => void;
  dismissedSuggestionIds: string[];
  suggestionsCollapsed: boolean;
  setSuggestionDismissed: (id: string) => void;
  resetSuggestionDismissals: () => void;
  setSuggestionsCollapsed: (collapsed: boolean) => void;
  favorites: Record<string, FavoriteEntry>;
  addFavorite: (entry: FavoriteEntry) => void;
  removeFavorite: (id: string) => void;
  lastVisitedRoute: string | null;
  setLastVisitedRoute: (route: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeOrb: "all",
      activeRole: "owner",
      lastViewedNode: null,
      myceliumSelection: { kind: "none" },
      introSeen: false,
      lastSnapshotId: null,
      recentEvents: [],
      dismissedSuggestionIds: [],
      suggestionsCollapsed: false,
      favorites: {},
      lastVisitedRoute: null,
      setActiveOrb: (orb) => {
        emitMoraEvent("orb_change", { orb });
        emitMoraEvent("filter_change", { orb });
        set({ activeOrb: orb });
      },
      setActiveRole: (role) => {
        emitMoraEvent("view_change", { role });
        set({ activeRole: role });
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
      setMyceliumSelection: (selection) => {
        set({ myceliumSelection: selection });
      },
      clearMyceliumSelection: () => {
        set({ myceliumSelection: { kind: "none" } });
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
      setSuggestionDismissed: (id) => {
        set((state) => {
          if (state.dismissedSuggestionIds.includes(id)) {
            return state;
          }
          return { dismissedSuggestionIds: [...state.dismissedSuggestionIds, id] };
        });
      },
      resetSuggestionDismissals: () => {
        set({ dismissedSuggestionIds: [] });
      },
      setSuggestionsCollapsed: (collapsed) => {
        set({ suggestionsCollapsed: collapsed });
      },
      addFavorite: (entry) => {
        if (!entry.id) return;
        set((state) => ({
          favorites: {
            ...state.favorites,
            [entry.id]: entry,
          },
        }));
      },
      removeFavorite: (id) => {
        set((state) => {
          if (!state.favorites[id]) return state;
          const next = { ...state.favorites };
          delete next[id];
          return { favorites: next };
        });
      },
      setLastVisitedRoute: (route) => {
        set({ lastVisitedRoute: route });
      },
    }),
    {
      name: "mora_session_store",
      version: 4,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as SessionState;
        }
        const nextState = { ...persistedState } as SessionState;
        if (
          version < 2 ||
          !Array.isArray((persistedState as Record<string, unknown>).recentEvents)
        ) {
          nextState.recentEvents = [];
        }
        if (version < 3) {
          nextState.dismissedSuggestionIds = [];
          nextState.suggestionsCollapsed = false;
          nextState.favorites = {};
          nextState.lastVisitedRoute = null;
        } else {
          if (!Array.isArray((persistedState as Record<string, unknown>).dismissedSuggestionIds)) {
            nextState.dismissedSuggestionIds = [];
          }
          if (typeof (persistedState as Record<string, unknown>).suggestionsCollapsed !== "boolean") {
            nextState.suggestionsCollapsed = false;
          }
          if (typeof (persistedState as Record<string, unknown>).favorites !== "object") {
            nextState.favorites = {};
          }
          if (typeof (persistedState as Record<string, unknown>).lastVisitedRoute !== "string") {
            nextState.lastVisitedRoute = null;
          }
        }
        const persistedRole = (persistedState as Record<string, unknown>).activeRole;
        if (
          typeof persistedRole !== "string" ||
          !["owner", "department", "member", "admin"].includes(persistedRole)
        ) {
          nextState.activeRole = "owner";
        }
        if (
          version < 4 ||
          typeof (persistedState as Record<string, unknown>).myceliumSelection !== "object" ||
          !(persistedState as Record<string, any>).myceliumSelection?.kind
        ) {
          nextState.myceliumSelection = { kind: "none" } as MyceliumSelection;
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

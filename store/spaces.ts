/**
 * Space Store (Zustand)
 *
 * Manages all spaces and current active space
 * Persists to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Space,
  CreateSpaceInput,
  UpdateSpaceInput,
  SpaceSource,
} from '@/lib/spaces/types';
import { DEFAULT_SPACE_SETTINGS, DEFAULT_SPACE_BRANDING } from '@/lib/spaces/types';

interface SpaceStore {
  // State
  spaces: Space[];
  currentSpaceId: string | null;

  // Getters
  getCurrentSpace: () => Space | null;
  getSpaceById: (id: string) => Space | null;

  // Actions
  createSpace: (input: CreateSpaceInput) => Space;
  updateSpace: (id: string, input: UpdateSpaceInput) => void;
  deleteSpace: (id: string) => void;
  setCurrentSpace: (id: string | null) => void;

  // Source Management
  addSource: (spaceId: string, source: Omit<SpaceSource, 'id' | 'created' | 'updated'>) => void;
  updateSource: (spaceId: string, sourceId: string, updates: Partial<SpaceSource>) => void;
  removeSource: (spaceId: string, sourceId: string) => void;

  // Stats Updates
  updateSpaceStats: (spaceId: string, stats: Partial<Space['stats']>) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      spaces: [],
      currentSpaceId: null,

      // Getters
      getCurrentSpace: () => {
        const { spaces, currentSpaceId } = get();
        if (!currentSpaceId) return null;
        return spaces.find(s => s.id === currentSpaceId) || null;
      },

      getSpaceById: (id: string) => {
        const { spaces } = get();
        return spaces.find(s => s.id === id) || null;
      },

      // Create Space
      createSpace: (input: CreateSpaceInput) => {
        const now = new Date();
        const id = generateSpaceId(input.name);

        const newSpace: Space = {
          id,
          name: input.name,
          description: input.description,
          icon: input.icon || '🏢',
          branding: input.branding ? { ...DEFAULT_SPACE_BRANDING, ...input.branding } : undefined,
          sources: [],
          settings: input.settings
            ? { ...DEFAULT_SPACE_SETTINGS, ...input.settings }
            : DEFAULT_SPACE_SETTINGS,
          stats: {
            objectCount: 0,
            lastSync: null,
          },
          created: now,
          updated: now,
        };

        set(state => ({
          spaces: [...state.spaces, newSpace],
          currentSpaceId: state.currentSpaceId || newSpace.id, // Auto-select if first space
        }));

        return newSpace;
      },

      // Update Space
      updateSpace: (id: string, input: UpdateSpaceInput) => {
        set(state => ({
          spaces: state.spaces.map(space =>
            space.id === id
              ? {
                  ...space,
                  ...input,
                  branding: input.branding
                    ? { ...space.branding, ...input.branding }
                    : space.branding,
                  settings: input.settings
                    ? { ...space.settings, ...input.settings }
                    : space.settings,
                  updated: new Date(),
                }
              : space
          ),
        }));
      },

      // Delete Space
      deleteSpace: (id: string) => {
        set(state => {
          const newSpaces = state.spaces.filter(s => s.id !== id);
          const newCurrentId =
            state.currentSpaceId === id
              ? newSpaces.length > 0
                ? newSpaces[0].id
                : null
              : state.currentSpaceId;

          return {
            spaces: newSpaces,
            currentSpaceId: newCurrentId,
          };
        });
      },

      // Set Current Space
      setCurrentSpace: (id: string | null) => {
        set({ currentSpaceId: id });
      },

      // Add Source
      addSource: (spaceId: string, source: Omit<SpaceSource, 'id' | 'created' | 'updated'>) => {
        const now = new Date();
        const sourceId = generateSourceId(source.type, source.name);

        set(state => ({
          spaces: state.spaces.map(space =>
            space.id === spaceId
              ? {
                  ...space,
                  sources: [
                    ...space.sources,
                    {
                      ...source,
                      id: sourceId,
                      created: now,
                      updated: now,
                    },
                  ],
                  updated: now,
                }
              : space
          ),
        }));
      },

      // Update Source
      updateSource: (spaceId: string, sourceId: string, updates: Partial<SpaceSource>) => {
        set(state => ({
          spaces: state.spaces.map(space =>
            space.id === spaceId
              ? {
                  ...space,
                  sources: space.sources.map(source =>
                    source.id === sourceId
                      ? {
                          ...source,
                          ...updates,
                          updated: new Date(),
                        }
                      : source
                  ),
                  updated: new Date(),
                }
              : space
          ),
        }));
      },

      // Remove Source
      removeSource: (spaceId: string, sourceId: string) => {
        set(state => ({
          spaces: state.spaces.map(space =>
            space.id === spaceId
              ? {
                  ...space,
                  sources: space.sources.filter(s => s.id !== sourceId),
                  updated: new Date(),
                }
              : space
          ),
        }));
      },

      // Update Stats
      updateSpaceStats: (spaceId: string, stats: Partial<Space['stats']>) => {
        set(state => ({
          spaces: state.spaces.map(space =>
            space.id === spaceId
              ? {
                  ...space,
                  stats: {
                    ...space.stats,
                    ...stats,
                  },
                  updated: new Date(),
                }
              : space
          ),
        }));
      },
    }),
    {
      name: 'mora-spaces', // localStorage key
      version: 1,
    }
  )
);

/**
 * Generate stable space ID from name
 */
function generateSpaceId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const timestamp = Date.now().toString(36);
  return `space_${slug}_${timestamp}`;
}

/**
 * Generate source ID
 */
function generateSourceId(type: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const timestamp = Date.now().toString(36);
  return `src_${type}_${slug}_${timestamp}`;
}

/**
 * Hook to get current space
 */
export function useCurrentSpace() {
  return useSpaceStore(state => state.getCurrentSpace());
}

/**
 * Hook to check if any spaces exist
 */
export function useHasSpaces() {
  return useSpaceStore(state => state.spaces.length > 0);
}

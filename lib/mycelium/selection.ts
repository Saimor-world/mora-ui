import { useSessionStore } from '@/store/session';
import type { MoraObject } from '@/lib/types';
import type { MoraNode, MoraSpace } from './model';

export type MyceliumSelection =
  | { kind: 'none' }
  | { kind: 'node'; node: MoraNode; object?: MoraObject }
  | { kind: 'space'; space: MoraSpace };

export function useMyceliumSelection() {
  const selection = useSessionStore((state) => state.myceliumSelection);
  const setSelection = useSessionStore((state) => state.setMyceliumSelection);
  const clearSelection = useSessionStore((state) => state.clearMyceliumSelection);

  return {
    selection,
    setSelection,
    clearSelection,
  };
}

export function mapObjectToNode(obj: MoraObject): MoraNode {
  return {
    id: obj.id,
    label: obj.title,
    type: obj.type,
    tags: obj.tags,
    space: obj.spaceId,
    meta: {
      path: obj.path,
      url: obj.url,
      source: obj.source,
    },
  };
}

import type { MoraObject } from '@/lib/types';

export type NodeInteractionSource = 'mycelium-graph' | 'organic-field' | 'unknown';

export interface PointerMeta {
  clientX: number;
  clientY: number;
  canvasX?: number;
  canvasY?: number;
}

export interface NodeClickEvent {
  type: 'click';
  node: MoraObject;
  pointer: PointerMeta;
  source?: NodeInteractionSource;
}

export interface NodeHoverEvent {
  type: 'hover';
  node: MoraObject | null;
  pointer?: PointerMeta;
  source?: NodeInteractionSource;
}

export interface NodeContextEvent {
  type: 'context';
  node: MoraObject;
  pointer: PointerMeta;
  source?: NodeInteractionSource;
}

export type NodeInteractionEvent = NodeClickEvent | NodeHoverEvent | NodeContextEvent;

type Listener = (event: NodeInteractionEvent) => void;

const listeners = new Set<Listener>();

function emit(event: NodeInteractionEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[nodeInteractions] listener error', error);
      }
    }
  });
}

export function emitNodeClick(event: Omit<NodeClickEvent, 'type'>) {
  emit({ type: 'click', ...event });
}

export function emitNodeHover(event: Omit<NodeHoverEvent, 'type'>) {
  emit({ type: 'hover', ...event });
}

export function emitNodeContext(event: Omit<NodeContextEvent, 'type'>) {
  emit({ type: 'context', ...event });
}

export function subscribeToNodeInteractions(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

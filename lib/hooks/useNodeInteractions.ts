import { useEffect } from 'react';
import type {
  NodeInteractionEvent,
  NodeClickEvent,
  NodeHoverEvent,
  NodeContextEvent,
} from '@/lib/events/nodeInteractions';
import { subscribeToNodeInteractions } from '@/lib/events/nodeInteractions';

type NodeInteractionType = NodeInteractionEvent['type'];

type EventForType<T extends NodeInteractionType> = Extract<NodeInteractionEvent, { type: T }>;

type HandlerMap = {
  [K in NodeInteractionType]: (event: EventForType<K>) => void;
};

export function useNodeInteraction<T extends NodeInteractionType>(
  type: T,
  handler: HandlerMap[T]
) {
  useEffect(() => {
    const unsubscribe = subscribeToNodeInteractions((event) => {
      if (event.type === type) {
        handler(event as EventForType<T>);
      }
    });

    return unsubscribe;
  }, [type, handler]);
}

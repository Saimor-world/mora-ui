/** Zustand eines Vorführtags im Café Morgenrot (FIKTIV). Reine Funktionen, damit Tests und UI dasselbe nutzen. */
export interface DemoNote { id: string; from: string; to: string; text: string; read: boolean }
export interface DemoDay {
  done: string[];
  reviews: Record<string, 'draft' | 'approved'>;
  order: 'open' | 'approved';
  oatCount: number | null;
  swap: 'requested' | 'approved' | 'declined';
  close: null | { cash: number; by: string; at: string };
  notes: DemoNote[];
}

export type DemoAction =
  | { type: 'task'; id: string }
  | { type: 'review'; id: string }
  | { type: 'reviewsAll' }
  | { type: 'order' }
  | { type: 'oat'; liters: number }
  | { type: 'swap'; answer: 'approved' | 'declined' }
  | { type: 'close'; cash: number; by: string; at: string }
  | { type: 'note'; from: string; to: string; text: string }
  | { type: 'readNote'; id: string }
  | { type: 'reset' };

export const initialDay = (): DemoDay => ({
  done: [], reviews: { 'rev-1': 'draft', 'rev-2': 'draft', 'rev-3': 'draft' }, order: 'open', oatCount: null, swap: 'requested', close: null, notes: [],
});

export function act(s: DemoDay, a: DemoAction): DemoDay {
  switch (a.type) {
    case 'task': return s.done.includes(a.id) ? { ...s, done: s.done.filter((x) => x !== a.id) } : { ...s, done: [...s.done, a.id] };
    case 'review': return { ...s, reviews: { ...s.reviews, [a.id]: 'approved' } };
    case 'reviewsAll': return { ...s, reviews: Object.fromEntries(Object.keys(s.reviews).map((k) => [k, 'approved'])) as DemoDay['reviews'] };
    case 'order': return { ...s, order: 'approved' };
    case 'oat': return { ...s, oatCount: a.liters, done: s.done.includes('t2') ? s.done : [...s.done, 't2'] };
    case 'swap': return { ...s, swap: a.answer };
    case 'close': return { ...s, close: { cash: a.cash, by: a.by, at: a.at } };
    case 'note': return { ...s, notes: [...s.notes, { id: `n${s.notes.length + 1}`, from: a.from, to: a.to, text: a.text, read: false }] };
    case 'readNote': return { ...s, notes: s.notes.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };
    case 'reset': return initialDay();
  }
}

export const reviewsOpen = (s: DemoDay) => Object.values(s.reviews).filter((v) => v === 'draft').length;

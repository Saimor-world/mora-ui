'use client';

import { useAppContext } from '@/lib/contexts';
import { ORBS } from '@/components/lens/OrbFilter';

export default function FilterBadge() {
  const { orb, activeTagFilter, setOrb, setActiveTagFilter } = useAppContext();

  const hasFilters = orb !== 'all' || activeTagFilter !== null;

  if (!hasFilters) return null;

  const orbName = ORBS.find((o) => o.slug === orb)?.name;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {orb !== 'all' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-full text-sm font-medium">
          <span>Gefiltert: {orbName}</span>
          <button
            onClick={() => setOrb('all')}
            className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
            title="Filter entfernen"
          >
            ✕
          </button>
        </div>
      )}
      {activeTagFilter && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-full text-sm font-medium">
          <span>#{activeTagFilter}</span>
          <button
            onClick={() => setActiveTagFilter(null)}
            className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
            title="Tag-Filter entfernen"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

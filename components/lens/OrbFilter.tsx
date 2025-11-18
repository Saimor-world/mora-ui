'use client';

import type { OrbSelection } from '@/lib/contexts';

export interface Orb {
  slug: OrbSelection;
  name: string;
  icon: string;
  description: string;
}

export const ORBS: Orb[] = [
  {
    slug: 'all',
    name: 'Alle',
    icon: '🌐',
    description: 'Alle Objects ohne Filter',
  },
  {
    slug: 'leitung',
    name: 'Leitung',
    icon: '👔',
    description: 'Leadership & Management View',
  },
  {
    slug: 'service',
    name: 'Service',
    icon: '🔧',
    description: 'Service Department View',
  },
  {
    slug: 'hr',
    name: 'HR',
    icon: '👥',
    description: 'Human Resources View',
  },
];

interface OrbFilterProps {
  selected: OrbSelection;
  onChange: (orb: OrbSelection) => void;
  hasActions?: boolean;
  hasRisk?: boolean;
}

export default function OrbFilter({ selected, onChange, hasActions = false, hasRisk = false }: OrbFilterProps) {
  return (
    <div
      className={`p-4 border-b border-border transition-colors duration-700 ${
        hasRisk ? 'ring-amber-400/40 animate-[pulse_1.3s_ease-out_2]' : ''
      } ${hasActions ? 'bg-primary/5 shadow-inner animate-[pulse_3.4s_ease-in-out_infinite]' : ''}`}
    >
      <div className="text-xs text-muted-foreground mb-2">Orb View</div>
      <div className="flex gap-2">
        {ORBS.map((orb) => (
          <button
            key={orb.slug}
            onClick={() => onChange(orb.slug)}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                selected === orb.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }
            `}
            title={orb.description}
          >
            <div className="flex items-center justify-center gap-1">
              <span>{orb.icon}</span>
              <span className="hidden sm:inline">{orb.name}</span>
            </div>
          </button>
        ))}
      </div>
      {selected !== 'all' && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          📊 Filtered by: {ORBS.find((o) => o.slug === selected)?.description}
        </div>
      )}
    </div>
  );
}

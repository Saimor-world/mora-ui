'use client';

import { ROLE_OPTIONS } from '@/lib/roles';
import { useRole } from '@/lib/hooks/useRole';

export default function RoleSwitcher() {
  const { role, setRole, definition } = useRole();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs shadow-sm">
      <span className="uppercase tracking-[0.3em] text-muted-foreground">Rolle</span>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value as typeof role)}
        className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
        aria-label="Sichtbare Rolle auswählen"
        title={definition.description}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="hidden sm:inline text-muted-foreground">{definition.description}</span>
    </div>
  );
}

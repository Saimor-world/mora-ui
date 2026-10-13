'use client';

import React from 'react';

/** Universe V2 OS controls: icon tiles, switches, segmented controls. Minimal text, direct manipulation. */
export function TileGrid({ children, size = 'm', label }: { children: React.ReactNode; size?: 's' | 'm' | 'l'; label?: string }) {
  return (
    <section className="uv2-tiles" data-size={size}>
      {label ? <div className="uv2-tiles__label">{label}</div> : null}
      <div className="uv2-tiles__grid">{children}</div>
    </section>
  );
}

export function Tile({ icon, label, badge, state, onClick, active, testId, children }: {
  icon: React.ReactNode; label: string; badge?: React.ReactNode; state?: 'on' | 'off' | 'warn' | 'busy';
  onClick?: () => void; active?: boolean; testId?: string; children?: React.ReactNode;
}) {
  return (
    <div className="uv2-tile" data-state={state} data-active={active ? '' : undefined} data-testid={testId}>
      <button type="button" className="uv2-tile__hit" onClick={onClick} disabled={!onClick} title={label}>
        <span className="uv2-tile__icon">{icon}{badge != null ? <span className="uv2-tile__badge">{badge}</span> : null}</span>
        <span className="uv2-tile__label">{label}</span>
      </button>
      {children ? <div className="uv2-tile__ctl">{children}</div> : null}
    </div>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className="uv2-switch" data-on={on ? '' : undefined} onClick={() => onChange(!on)}>
      <span className="uv2-switch__knob" />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="uv2-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} data-on={value === o.id ? '' : undefined} onClick={() => onChange(o.id)}>
          {o.icon}{o.label ? <span>{o.label}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function PillButton({ children, onClick, primary, disabled, icon }: { children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  return <button type="button" className="uv2-pill" data-primary={primary ? '' : undefined} onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

'use client';

import React from 'react';

/** Universe V2: the shared "register" – hairline rows, mono meta, serif title, quiet text, actions at the side. */
export function RegisterSection({ label, count, children, aside }: { label: string; count?: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="uv2-regsec" data-uv2-regsec>
      <div className="uv2-regsec__head">
        <span>{label}{typeof count === 'number' ? <span className="uv2-regsec__count"> · {count}</span> : null}</span>
        {aside ? <span className="uv2-regsec__aside">{aside}</span> : null}
      </div>
      <ul className="uv2-register uv2-register--flush">{children}</ul>
    </section>
  );
}

export function RegisterRow({ meta, title, text, side, actions, onClick, tone, testId }: {
  meta?: React.ReactNode; title: React.ReactNode; text?: React.ReactNode; side?: React.ReactNode;
  actions?: React.ReactNode; onClick?: () => void; tone?: 'gold' | 'quiet' | 'alert'; testId?: string;
}) {
  const body = (
    <>
      {meta ? <span className="uv2-register__meta">{meta}</span> : null}
      <span className="uv2-register__title">{title}</span>
      {text ? <span className="uv2-register__text">{text}</span> : null}
      {side ? <span className={'uv2-register__side' + (tone === 'gold' ? ' uv2-register__side--gold' : '')}>{side}</span> : null}
    </>
  );
  return (
    <li data-uv2-tone={tone} data-testid={testId}>
      {onClick ? <button type="button" className="uv2-register__row" onClick={onClick}>{body}</button> : <div className="uv2-register__row">{body}</div>}
      {actions ? <div className="uv2-regactions">{actions}</div> : null}
    </li>
  );
}

export function RegAction({ children, onClick, primary, disabled }: { children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={'uv2-regaction' + (primary ? ' uv2-regaction--primary' : '')} onClick={onClick} disabled={disabled}>{children}</button>
  );
}

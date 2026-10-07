import React from 'react';
import { cx } from './cx';

export interface NavItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  compact?: boolean;
  trailing?: React.ReactNode;
}

export function NavItem({ icon, label, active, compact, trailing, className, ...rest }: NavItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cx('os-nav-item', compact && 'os-nav-item--compact', className)}
      {...rest}
    >
      <span className="os-nav-item__icon" aria-hidden>{icon}</span>
      <span className="truncate">{label}</span>
      {!compact && trailing ? <span className="ml-auto">{trailing}</span> : null}
    </button>
  );
}

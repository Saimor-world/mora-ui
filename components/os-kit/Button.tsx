import React from 'react';
import { cx } from './cx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'md' | 'sm';
  icon?: React.ReactNode;
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon, iconOnly, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('os-button', variant !== 'default' && `os-button--${variant}`, size === 'sm' && 'os-button--sm', iconOnly && 'os-button--icon', className)}
      {...rest}
    >
      {icon}
      {!iconOnly && children}
    </button>
  );
});

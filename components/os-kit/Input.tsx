import React from 'react';
import { cx } from './cx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel = true, id, className, ...rest },
  ref,
) {
  const autoId = React.useId();
  const inputId = id || autoId;
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'os-text-meta os-tone-faint'}>{label}</label>
      <input ref={ref} id={inputId} className={cx('os-input', className)} {...rest} />
    </div>
  );
});

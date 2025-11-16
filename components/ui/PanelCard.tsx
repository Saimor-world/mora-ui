'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface PanelCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  paddingClassName?: string;
}

export default function PanelCard({
  children,
  className,
  paddingClassName = 'p-4',
  ...props
}: PanelCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-card/85 shadow-lg',
        paddingClassName,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

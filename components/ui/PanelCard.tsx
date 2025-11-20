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
        // Organisches Design - wie schwebende Pilze im Myzelium
        'rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-950/30 via-emerald-900/15 to-transparent',
        'backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(16,185,129,0.08)]',
        'hover:shadow-[0_12px_48px_0_rgba(16,185,129,0.15)] hover:border-emerald-500/15',
        'transition-all duration-700',
        'animate-in fade-in slide-in-from-bottom-2 duration-1000',
        paddingClassName,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

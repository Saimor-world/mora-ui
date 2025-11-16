'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  containerClassName?: string;
  maxWidthClassName?: string;
}

const PageSection = forwardRef<HTMLElement, PageSectionProps>(function PageSection(
  { children, className, containerClassName, maxWidthClassName = 'max-w-6xl', ...props },
  ref
) {
  return (
    <section ref={ref} className={cn('px-4 sm:px-8', className)} {...props}>
      <div className={cn('w-full mx-auto', maxWidthClassName, containerClassName)}>{children}</div>
    </section>
  );
});

export default PageSection;

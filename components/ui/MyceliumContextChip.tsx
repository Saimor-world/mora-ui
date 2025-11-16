'use client';

import { cn } from '@/lib/utils';
import { useMyceliumSelection } from '@/lib/mycelium/selection';

interface MyceliumContextChipProps {
  className?: string;
  neutralText?: string;
}

export default function MyceliumContextChip({
  className,
  neutralText = 'Kein konkreter Kontext',
}: MyceliumContextChipProps) {
  const { selection } = useMyceliumSelection();
  const label =
    selection.kind === 'node'
      ? selection.node.label
      : selection.kind === 'space'
      ? selection.space.label
      : null;
  const display =
    label && label.length > 32 ? `${label.slice(0, 29).trimEnd()}...` : label ?? '';
  const kindIcon =
    selection.kind === 'space'
      ? '▢'
      : selection.kind === 'node'
      ? '●'
      : '○';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground',
        className
      )}
      title={label || neutralText}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full bg-primary shadow-[0_0_0_3px_rgba(34,197,94,0.15)] flex items-center justify-center text-[10px] text-primary-foreground'
        )}
        aria-hidden="true"
      >
        {kindIcon}
      </span>
      {label ? `Kontext: ${display}` : neutralText}
    </span>
  );
}

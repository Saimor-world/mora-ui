import React from 'react';
import { WidgetBoard } from './WidgetBoard';
import type { SourceWidget } from './types';

/** The same Home content renders adapter-provided sources for any organization. */
export function HomeOverview({
  greeting,
  subline,
  titleClass,
  sublineClass,
  children,
  widgets,
  onOpenWidget,
}: {
  greeting?: string;
  subline?: string;
  titleClass: string;
  sublineClass: string;
  children: React.ReactNode;
  widgets: SourceWidget[];
  onOpenWidget?: (id: string) => void;
}) {
  return (
    <>
      {/* „Visuelles spricht, Text schweigt“: no greeting or explanatory subline unless a caller passes one. */}
      {greeting ? <h1 className={titleClass}>{greeting}</h1> : null}
      {subline ? <p className={sublineClass}>{subline}</p> : null}
      {children}
      <WidgetBoard widgets={widgets} onOpen={onOpenWidget} />
    </>
  );
}

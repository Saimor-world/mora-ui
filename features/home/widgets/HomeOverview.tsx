import React from 'react';
import { WidgetBoard } from './WidgetBoard';
import type { SourceWidget } from './types';

/** The same Home content renders adapter-provided sources for any organization. */
export function HomeOverview({ greeting, subline, titleClass, sublineClass, children, widgets }: {
  greeting: string; subline: string; titleClass: string; sublineClass: string;
  children: React.ReactNode; widgets: SourceWidget[];
}) {
  return <>
    <h1 className={titleClass}>{greeting}</h1>
    <p className={sublineClass}>{subline}</p>
    {children}
    <WidgetBoard widgets={widgets} />
  </>;
}

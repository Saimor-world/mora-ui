'use client';

/**
 * PaneShell — shared window chrome for app-platform adapters.
 *
 * Wraps app content in GlassPanel and wires up all standard pane
 * lifecycle (drag, resize, close, minimize, focus) from paneStore.
 * Reads title from pane.title unless an override is passed.
 *
 * Usage:
 *   <PaneShell id={id} defaultWidth={540} defaultHeight={680}>
 *     <AppLoader appId="notes" paneId={id} initialData={data ?? {}} />
 *   </PaneShell>
 */

import React from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';

interface PaneShellProps {
  id: string;
  children: React.ReactNode;
  title?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  padding?: number;
  modal?: boolean;
}

export function PaneShell({
  id,
  children,
  title,
  defaultWidth = 720,
  defaultHeight = 580,
  padding = 2,
  modal = false,
}: PaneShellProps) {
  const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
  const isActive = usePaneStore(s => s.activePaneId === id);
  const pane = getPane(id);
  if (!pane) return null;

  return (
    <GlassPanel
      title={title ?? pane.title}
      paneId={id}
      width={pane.size?.width ?? defaultWidth}
      height={pane.size?.height ?? defaultHeight}
      padding={padding}
      initialX={pane.position.x}
      initialY={pane.position.y}
      onPositionChange={(x, y) => updatePanePosition(id, x, y)}
      onResize={(w, h) => updatePaneSize(id, w, h)}
      onClose={() => removePane(id)}
      onMinimize={() => minimizePane(id)}
      onFocus={() => focusPane(id)}
      isActive={isActive}
      zIndex={modal ? Math.max(pane.zIndex, 960) : pane.zIndex}
      dimBackground={modal}
      dimOpacity={0.46}
      onDimClick={modal ? () => removePane(id) : undefined}
      showCloseButton
      showMinimizeButton
      draggable
      resizable
    >
      {children}
    </GlassPanel>
  );
}

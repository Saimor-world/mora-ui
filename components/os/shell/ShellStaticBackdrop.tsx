'use client';

import React from 'react';
import { WorldSurface } from '@/components/engine/WorldSurface';

/**
 * Backward-compatible OS adapter for the shared Saimôr Engine world surface.
 *
 * MoraShell keeps its richer scene-reactive ambient layers on top; this base
 * plate is now the same engine-level underlay Desk can consume as well.
 */
export const ShellStaticBackdrop: React.FC = () => <WorldSurface surface="os" />;

export default ShellStaticBackdrop;

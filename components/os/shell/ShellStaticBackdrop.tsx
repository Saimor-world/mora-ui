'use client';

import React from 'react';
import { WorldSurface } from '@/components/engine/WorldSurface';

/**
 * Backward-compatible adapter for the shared Saimôr Engine world surface.
 * MoraShell keeps its richer scene-reactive ambient layers on top.
 */
export const ShellStaticBackdrop: React.FC = () => <WorldSurface />;

export default ShellStaticBackdrop;

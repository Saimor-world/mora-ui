'use client';

import React from 'react';
import { WorldSurface } from '@/components/engine/WorldSurface';

/**
 * Backward-compatible Saimôr OS adapter for the shared Engine world surface.
 *
 * MoraShell keeps its richer scene-reactive ambient layers on top. The base
 * plate belongs to the OS shell; Desk is the default workspace inside that OS.
 */
export const ShellStaticBackdrop: React.FC = () => <WorldSurface context="shell" />;

export default ShellStaticBackdrop;

'use client';
import React from 'react';
import type { FeatureSurfaceProps } from '../types';
import { UnifiedUniverse } from './ui/UnifiedUniverse';

/**
 * Universe Feature Surface — Alle Einstiegspunkte (Home, Heute, Planet-Klick, URL)
 * nutzen dieselbe kanonische UnifiedUniverse-Komponente mit genau einer MÔRA.
 */
export default function UniverseSurface({ navigate, preview }: FeatureSurfaceProps) {
  return (
    <div className="os-universe" data-testid="feature-universe">
      <UnifiedUniverse navigate={navigate} preview={preview} />
    </div>
  );
}

'use client';
import React from 'react';
import type { FeatureSurfaceProps } from '../types';
import { useFirmaParam } from '../home/data/useDemoViewer';
import { MorgenrotHome } from '../home/morgenrot/MorgenrotHome';
import { LiveCockpit } from '../home/cockpit/LiveCockpit';

/**
 * Universe surface: Glasplaneten-Cockpit im Firmen-Modus (Universe-Sicht).
 * Keine flachen SVG-Ellipsen mehr, sondern echte Glasplaneten als Abteilungen
 * und Monde als Ordner um MÔRA.
 */
export default function UniverseSurface({ navigate, preview }: FeatureSurfaceProps) {
  const firma = useFirmaParam();
  if (firma === 'morgenrot') return <MorgenrotHome navigate={navigate} initialView="universe" preview={preview} />;
  return <LiveCockpit navigate={navigate} initialView="universe" />;
}

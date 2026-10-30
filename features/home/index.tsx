'use client';
import './home.css';
import React from 'react';
import type { FeatureSurfaceProps } from '../types';
import { useFirmaParam } from './data/useDemoViewer';
import { MorgenrotHome } from './morgenrot/MorgenrotHome';
import { ConnectedCockpit } from './cockpit/ConnectedCockpit';

export default function HomeSurface({ navigate, preview }: FeatureSurfaceProps) {
  const firma = useFirmaParam();
  // ?firma=morgenrot: the real demo company from CORE; the seed only as a marked offline fallback.
  if (firma === 'morgenrot') return <MorgenrotHome navigate={navigate} initialView="home" preview={preview} />;
  return <ConnectedCockpit navigate={navigate} initialView="home" />;
}

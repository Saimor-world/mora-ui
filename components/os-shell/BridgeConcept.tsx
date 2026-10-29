'use client';
import React from 'react';
import './bridge-concept.css';

/** Visual study only. Actual events and navigation are deliberately not simulated. */
export function BridgeConcept() {
  return (
    <div className="bridge-concept" aria-label="Brückenentwurf: Zeitbogen noch ohne Ereignisse">
      <div className="bridge-concept__arc" aria-hidden="true" />
      <div className="bridge-concept__legend">
        <span>Jetzt</span>
        <span>ZEITBOGEN · ENTWURF</span>
        <span>Nächste Frist</span>
      </div>
    </div>
  );
}

'use client';
import React, { useEffect, useRef } from 'react';
import { PlanetInterior } from '@/components/universe/PlanetInterior';
import { useNavStore } from '@/lib/store/navStore';

/**
 * Ein Planet von innen, als Fenster über dem Universe. Das Innere ist das aus main
 * (PlanetInterior: Horizont, Bereiche als Monde, zuletzt bewegte Dokumente).
 */
export function PlanetWindow({ companyId, departmentId, name, onClose, onOpenSpace, onAskMora }: {
  companyId: string;
  departmentId: string;
  name: string;
  onClose: () => void;
  onOpenSpace: (spaceId: string) => void;
  onAskMora: (question: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // PlanetInterior liest Firma und Abteilung aus dem navStore.
    useNavStore.setState({ activeCompanyId: companyId, activeDepartmentId: departmentId });
    return () => useNavStore.setState({ activeDepartmentId: null });
  }, [companyId, departmentId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="wd-interior" role="dialog" aria-modal="true" aria-label={`Planet ${name}`} data-testid="world-planet-window">
      <PlanetInterior onOpenSpace={onOpenSpace} onAskMora={onAskMora} />
      <button ref={closeRef} type="button" className="wd-interior__close" onClick={onClose} data-testid="world-planet-close">
        Zurück zum Universe
      </button>
    </div>
  );
}

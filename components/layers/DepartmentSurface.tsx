"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Orbit } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { usePaneStore } from '@/lib/store/paneStore';
import { usePresence } from '@/lib/hooks/usePresence';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { DepartmentView } from '@/components/home/DepartmentView';
import { selectRecentDepartmentDocs } from '@/lib/openflow/departmentContext';
import { filterIncidentsForDepartment } from '@/lib/openflow/departmentIncidentContext';
import { nightwatchIncidentsToIncidentStatusPanels, type NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import type { ConnectorStatus, OpenFlowSignal } from '@/lib/openflow/types';

type SurfaceMode = 'map' | 'overview';

/**
 * Routes the department level between the spatial orbit map (DepartmentLayer,
 * manager view) and the daily overview (DepartmentView: team online, recent
 * docs, Mora suggestions, external data). Default stays on the map to preserve
 * existing behavior; a local toggle reveals the overview.
 */
export const DepartmentSurface: React.FC = () => {
  const [mode, setMode] = useState<SurfaceMode>('map');
  const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
  const activeCompanyId = useNavStore((s) => s.activeCompanyId);
  const { openPane } = usePaneStore();
  const { peers } = usePresence();

  const { data: departments = [] } = useDepartments(activeCompanyId);
  const { data: treeData = [] } = useTree(activeCompanyId);
  const [nightwatchIncidents, setNightwatchIncidents] = useState<NightwatchIncidentItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchNightwatchIncidents()
      .then((incidents) => {
        if (!cancelled) setNightwatchIncidents(incidents ?? []);
      })
      .catch(() => {
        if (!cancelled) setNightwatchIncidents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const departmentName = useMemo(
    () => (Array.isArray(departments) ? departments : []).find((d) => d.id === activeDepartmentId)?.name || 'Abteilung',
    [departments, activeDepartmentId],
  );

  const recentDocs = useMemo(
    () => (activeDepartmentId ? selectRecentDepartmentDocs(Array.isArray(treeData) ? treeData : [], activeDepartmentId, 6) : []),
    [treeData, activeDepartmentId],
  );

  const globalIncidentPanels = useMemo(
    () => nightwatchIncidentsToIncidentStatusPanels(nightwatchIncidents),
    [nightwatchIncidents],
  );

  const departmentIncidentPanels = useMemo(() => {
    const scopedIncidents = filterIncidentsForDepartment(
      nightwatchIncidents,
      activeDepartmentId,
      Array.isArray(treeData) ? treeData : [],
    );
    return nightwatchIncidentsToIncidentStatusPanels(scopedIncidents);
  }, [activeDepartmentId, nightwatchIncidents, treeData]);

  const hasGlobalIncidentsWithoutDepartmentEvidence = globalIncidentPanels.length > 0 && departmentIncidentPanels.length === 0;

  // Honest empty states until these sources are wired (project rule: no mock data).
  const suggestions: OpenFlowSignal[] = [];
  const connectors: ConnectorStatus[] = [];

  if (!activeDepartmentId) return null;

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-8 left-1/2 z-50 -translate-x-1/2">
        <div className="flex rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setMode('map')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${mode === 'map' ? 'bg-emerald-500 text-black' : 'text-white/45 hover:text-white/75'}`}
          >
            <Orbit size={13} /> Karte
          </button>
          <button
            type="button"
            onClick={() => setMode('overview')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${mode === 'overview' ? 'bg-emerald-500 text-black' : 'text-white/45 hover:text-white/75'}`}
          >
            <LayoutGrid size={13} /> Übersicht
          </button>
        </div>
      </div>

      {mode === 'map' ? (
        <DepartmentLayer
          incidentPanels={departmentIncidentPanels}
          hasUnscopedIncidents={hasGlobalIncidentsWithoutDepartmentEvidence}
        />
      ) : (
        <div className="h-full w-full overflow-y-auto">
          <DepartmentView
            departmentName={departmentName}
            peers={peers}
            recentDocs={recentDocs}
            suggestions={suggestions}
            connectors={connectors}
            incidentPanels={departmentIncidentPanels}
            hasUnscopedIncidents={hasGlobalIncidentsWithoutDepartmentEvidence}
            onOpenDoc={(id) => {
              const doc = recentDocs.find((d) => d.id === id);
              openPane({
                id: `document-${id}`,
                type: 'document',
                title: doc?.title || 'Dokument',
                size: { width: 900, height: 700 },
                data: { nodeId: id },
              });
            }}
            onSwitchToMap={() => setMode('map')}
            onOpenFinder={() => openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 900, height: 700 }, data: { departmentId: activeDepartmentId } })}
            onOpenNightwatch={() => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: { width: 1000, height: 680 } })}
          />
        </div>
      )}
    </div>
  );
};

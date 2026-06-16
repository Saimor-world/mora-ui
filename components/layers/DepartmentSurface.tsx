"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Grid2X2, LayoutGrid, Orbit } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useSpaces } from '@/lib/queries/useSpaces';
import { usePaneStore } from '@/lib/store/paneStore';
import { usePresence } from '@/lib/hooks/usePresence';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { DepartmentView } from '@/components/home/DepartmentView';
import { DeptSpaceMap } from '@/components/mora/DeptSpaceMap';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { selectRecentDepartmentDocs } from '@/lib/openflow/departmentContext';
import { filterIncidentsForDepartment } from '@/lib/openflow/departmentIncidentContext';
import { nightwatchIncidentsToIncidentStatusPanels, type NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import type { ConnectorStatus, OpenFlowSignal } from '@/lib/openflow/types';

type SurfaceMode = 'map' | 'overview' | 'spaces';

/**
 * Routes the department level between the spatial orbit map (DepartmentLayer,
 * manager view) and the daily overview (DepartmentView: team online, recent
 * docs, Mora suggestions, external data).
 *
 * Default mode is DATA-AWARE: a sparse department (few spaces, no folders)
 * has nothing meaningful to show on the orbit map, so we land the user on the
 * actionable overview instead. A spatially rich department keeps the signature
 * orbit map. Once the user picks a mode by hand, their choice wins until they
 * navigate to a different department.
 */
export const DepartmentSurface: React.FC = () => {
  const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
  const activeCompanyId = useNavStore((s) => s.activeCompanyId);
  const { openPane } = usePaneStore();
  const { peers } = usePresence();

  const { data: departments = [] } = useDepartments(activeCompanyId);
  const { data: treeData = [] } = useTree(activeCompanyId);
  const { data: deptSpaces = [], isLoading: spacesLoading } = useSpaces(activeDepartmentId);
  const [nightwatchIncidents, setNightwatchIncidents] = useState<NightwatchIncidentItem[]>([]);

  // Has the department enough spatial substance to make the orbit map worthwhile?
  const spatiallyRich = deptSpaces.length >= 2 || deptSpaces.some((s) => (s.folder_count ?? 0) > 0);
  const autoMode: SurfaceMode = spacesLoading ? 'map' : spatiallyRich ? 'map' : 'overview';

  // null = follow the data-aware auto default; a value = the user's explicit pick.
  const [explicitMode, setExplicitMode] = useState<SurfaceMode | null>(null);
  const mode = explicitMode ?? autoMode;

  // Re-evaluate the auto default whenever the user switches department.
  useEffect(() => {
    setExplicitMode(null);
  }, [activeDepartmentId]);

  const setMode = setExplicitMode;

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
      {/* DEPARTMENT WIDGETS — float above all modes, planet map / overview still interactive below */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-y-auto px-4 pt-4 pb-28" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}>
        <div className="pointer-events-auto">
          <WidgetGrid
            surface="department"
            context={{
              surface: 'department',
              openMora: () => openPane({ id: 'mora-dept', type: 'mora-hub', title: 'MÔRA', size: { width: 480, height: 640 } }),
              openFinder: () => openPane({ id: 'finder-dept', type: 'finder', title: 'Finder', size: { width: 900, height: 700 }, data: { departmentId: activeDepartmentId } }),
              goExplore: () => setMode('map'),
            }}
          />
        </div>
      </div>

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
          <button
            type="button"
            onClick={() => setMode('spaces')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${mode === 'spaces' ? 'bg-emerald-500 text-black' : 'text-white/45 hover:text-white/75'}`}
          >
            <Grid2X2 size={13} /> Bereiche
          </button>
        </div>
      </div>

      {mode === 'map' ? (
        <DepartmentLayer
          incidentPanels={departmentIncidentPanels}
          hasUnscopedIncidents={hasGlobalIncidentsWithoutDepartmentEvidence}
        />
      ) : mode === 'spaces' ? (
        <DeptSpaceMap
          departmentId={activeDepartmentId}
          departmentName={departmentName}
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

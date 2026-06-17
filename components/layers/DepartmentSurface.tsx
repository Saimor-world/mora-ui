'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { useTree } from '@/lib/queries/useTree';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { filterIncidentsForDepartment } from '@/lib/openflow/departmentIncidentContext';
import { nightwatchIncidentsToIncidentStatusPanels, type NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';

/**
 * DepartmentSurface keeps one spatial workspace for every department.
 * Operational information is rendered as HUD widgets by DepartmentLayer;
 * sparse departments no longer fall back to a separate flat page.
 */
export const DepartmentSurface: React.FC = () => {
  const activeDepartmentId = useNavStore((state) => state.activeDepartmentId);
  const activeCompanyId = useNavStore((state) => state.activeCompanyId);
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

  const hasGlobalIncidentsWithoutDepartmentEvidence =
    globalIncidentPanels.length > 0 && departmentIncidentPanels.length === 0;

  if (!activeDepartmentId) return null;

  return (
    <DepartmentLayer
      incidentPanels={departmentIncidentPanels}
      hasUnscopedIncidents={hasGlobalIncidentsWithoutDepartmentEvidence}
    />
  );
};

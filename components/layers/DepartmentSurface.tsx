"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { usePaneStore } from '@/lib/store/paneStore';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { ESTATE } from '@/lib/estate';
import { CosmicBackdrop } from '@/components/universe/CosmicBackdrop';
import { filterIncidentsForDepartment } from '@/lib/openflow/departmentIncidentContext';
import { nightwatchIncidentsToIncidentStatusPanels, type NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import { getDeptStyle } from '@/lib/utils/deptStyle';
import {
    isNearAnyPlanet,
    resolveUniverseFocusMode,
    resolveUniverseInteractionZone,
    universeWidgetOpacity,
    type UniverseFocusMode,
} from '@/lib/universe/interactionZones';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';
import { feedsPaneRequest } from '@/lib/rss/feedsPane';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { resolveIntegrationConnectionStates } from '@/lib/integrations/connectionState';

/**
 * Department surface — zoomed into one planet, cosmos still visible.
 * Hero: orbital space map (DepartmentLayer). Periphery: compact glance widgets.
 */
export const DepartmentSurface: React.FC = () => {
  const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
  const activeCompanyId = useNavStore((s) => s.activeCompanyId);
  const { openPane } = usePaneStore();
  const [nightwatchIncidents, setNightwatchIncidents] = useState<NightwatchIncidentItem[]>([]);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [focusMode, setFocusMode] = useState<UniverseFocusMode>('explore');

  const { data: departments = [] } = useDepartments(activeCompanyId);
  const { data: treeData = [] } = useTree(activeCompanyId);
  const {
    overview: integrationsOverview,
    isLoading: integrationsLoading,
    error: integrationsError,
  } = useCommunicationSurface();
  const { mailPreview, calendarPreview, feedPreview } = useCommunicationLiveData();
  const integrationStates = resolveIntegrationConnectionStates(
    integrationsOverview,
    integrationsLoading,
    integrationsError,
  );

  const openMailPane = useCallback(() => {
    if (!integrationsOverview?.mail?.configured) {
      openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: GLASS_SHEET_SIZE });
      return;
    }
    openPane({ id: 'mail-main', type: 'mail', title: 'Post', size: { width: 960, height: 720 } });
  }, [integrationsOverview?.mail?.configured, openPane]);

  const openCalendarPane = useCallback(() => {
    if (!integrationsOverview?.calendar?.configured) {
      openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: GLASS_SHEET_SIZE });
      return;
    }
    openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 840, height: 620 } });
  }, [integrationsOverview?.calendar?.configured, openPane]);

  useEffect(() => {
    let cancelled = false;
    fetchNightwatchIncidents()
      .then((incidents) => { if (!cancelled) setNightwatchIncidents(incidents ?? []); })
      .catch(() => { if (!cancelled) setNightwatchIncidents([]); });
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  const department = useMemo(
    () => (Array.isArray(departments) ? departments : []).find((d) => d.id === activeDepartmentId) ?? null,
    [departments, activeDepartmentId],
  );

  const deptTint = useMemo(() => {
    if (!department) return '#10b981';
    return getDeptStyle(department.name, department.color).glow;
  }, [department]);

  const departmentIncidentPanels = useMemo(() => {
    const scoped = filterIncidentsForDepartment(
      nightwatchIncidents,
      activeDepartmentId,
      Array.isArray(treeData) ? treeData : [],
    );
    return nightwatchIncidentsToIncidentStatusPanels(scoped);
  }, [activeDepartmentId, nightwatchIncidents, treeData]);

  const globalPanels = useMemo(
    () => nightwatchIncidentsToIncidentStatusPanels(nightwatchIncidents),
    [nightwatchIncidents],
  );
  const hasUnscopedIncidents = globalPanels.length > 0 && departmentIncidentPanels.length === 0;

  const handlePointerMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const normX = (event.clientX - rect.left) / rect.width;
    const normY = (event.clientY - rect.top) / rect.height;
    setParallaxOffset({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 14,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 10,
    });
    setFocusMode(resolveUniverseFocusMode({
      zone: resolveUniverseInteractionZone(normX, normY),
      nearPlanet: isNearAnyPlanet(normX, normY, [{ x: 50, y: 50 }]),
      planetHovered: false,
      widgetHovered: false,
    }));
  }, []);

  if (!activeDepartmentId) return null;

  const widgetOpacity = universeWidgetOpacity(focusMode, false);

  return (
    <div
      className="relative h-full w-full overflow-hidden text-white"
      onMouseMove={handlePointerMove}
      onMouseLeave={() => {
        setParallaxOffset({ x: 0, y: 0 });
        setFocusMode('explore');
      }}
    >
      <CosmicBackdrop deptTint={deptTint} parallax={parallaxOffset} />

      {/* Hero orbit — department planet + space moons */}
      <DepartmentLayer
        cosmosMode
        incidentPanels={departmentIncidentPanels}
        hasUnscopedIncidents={hasUnscopedIncidents}
      />

      {/* Edge glance widgets — same band model as universe */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[10] overflow-y-auto px-3 pt-16 pb-28"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}
        animate={{ opacity: widgetOpacity, filter: focusMode === 'explore' ? 'blur(1px)' : 'blur(0px)' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="pointer-events-none">
          <WidgetGrid
            surface="department"
            focusMode={focusMode}
            context={{
              surface: 'department',
              departmentId: activeDepartmentId,
              data: {
                mailPreview,
                calendarPreview,
                feedPreview,
                mailState: integrationStates.mail,
                calendarState: integrationStates.calendar,
                cloudState: integrationStates.cloud,
                rssState: integrationStates.rss,
              },
              openMail: openMailPane,
              openCalendar: openCalendarPane,
              openFeed: () => openPane(feedsPaneRequest()),
              openMora: () => openPane({ id: 'mora-dept', type: 'mora-hub', title: 'MÔRA', size: GLASS_SHEET_SIZE }),
              openFinder: () => openPane({
                id: 'finder-dept',
                type: 'finder',
                title: 'Finder',
                size: GLASS_SHEET_SIZE,
                data: { departmentId: activeDepartmentId },
              }),
              openTeam: () => openPane({ id: 'team-main', type: 'team', title: 'Team', size: GLASS_SHEET_SIZE }),
              openIntegrations: () => openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: GLASS_SHEET_SIZE }),
              openApps: () => openPane({ id: 'apps-main', type: 'apps', title: 'Apps', size: { width: 900, height: 680 } }),
              openNightwatch: () => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: GLASS_SHEET_SIZE }),
              openDashboard: () => window.open(ESTATE.desk, '_blank', 'noopener,noreferrer'),
              openLarryNode: (nodeId, title) => openPane({
                id: `document-${nodeId}`,
                type: 'document',
                title: title || 'Workspace',
                size: GLASS_SHEET_SIZE,
                data: { nodeId },
              }),
              goExplore: () => useNavStore.getState().navigateToExplore(),
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

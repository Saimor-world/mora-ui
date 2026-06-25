'use client';

import { useMemo } from 'react';
import { useHomeView, useHomeStatus } from '@/lib/queries/useHomeView';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { buildOpenFlowLagebild } from '@/lib/openflow/presentation';
import { nightwatchIncidentsToIncidentStatusPanels, nightwatchIncidentsToSignals } from '@/lib/openflow/nightwatch';
import { buildFieldFromOpenFlow } from '@/lib/lagefeld/buildFieldFromOpenFlow';
import type { UiToolCall } from '@/lib/lagefeld/types';
import { useQuery } from '@tanstack/react-query';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';

function isUiToolCall(value: unknown): value is UiToolCall {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Partial<UiToolCall>;
  return (
    typeof maybe.name === 'string'
    && ['placeCard', 'connect', 'placeSymbol', 'proposeAction'].includes(maybe.name)
    && !!maybe.input
    && typeof maybe.input === 'object'
    && !Array.isArray(maybe.input)
  );
}

function readInitialUiActions(initialData?: Record<string, unknown>): UiToolCall[] | null {
  const raw = initialData?.uiActions;
  if (!Array.isArray(raw)) return null;
  const actions = raw.filter(isUiToolCall);
  return actions.length ? actions : null;
}

export function useLagefeldSignals(initialData?: Record<string, unknown>) {
  const injected = useMemo(() => readInitialUiActions(initialData), [initialData]);
  const { data: homeView } = useHomeView();
  const { data: homeStatus } = useHomeStatus();
  const { mailPreview, calendarPreview, feedPreview, cloudPreview } = useCommunicationLiveData();
  const { communicationSummary } = useCommunicationSurface();
  const { data: nightwatchIncidents = [] } = useQuery({
    queryKey: ['nightwatch', 'incidents', 'lagefeld'],
    queryFn: () => fetchNightwatchIncidents(),
    staleTime: 60_000,
  });

  const openFlow = useMemo(() => buildOpenFlowLagebild({
    mailPreview,
    calendarPreview,
    feedPreview,
    cloudPreview,
    homeView: homeView ?? null,
    homeStatus: homeStatus ?? null,
    communicationSummary,
    nightwatchSignals: nightwatchIncidentsToSignals(nightwatchIncidents),
    incidentStatusPanels: nightwatchIncidentsToIncidentStatusPanels(nightwatchIncidents),
  }), [
    mailPreview,
    calendarPreview,
    feedPreview,
    cloudPreview,
    homeView,
    homeStatus,
    communicationSummary,
    nightwatchIncidents,
  ]);

  const uiActions = useMemo(() => {
    if (injected) return injected;
    return buildFieldFromOpenFlow(openFlow);
  }, [injected, openFlow]);

  const isLoading = !injected && !homeView && !homeStatus;

  return {
    uiActions,
    openFlow,
    isLoading,
    hasSignals: uiActions.length > 0,
  };
}

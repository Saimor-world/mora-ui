'use client';

import { useQuery, useMutation, type UseQueryOptions } from '@tanstack/react-query';
import api from '../api';
import type { MoraObject, Snapshot } from '../types';

type ObjectQueryParams = {
  spaceId?: string;
  type?: string;
  orb?: string;
};

interface HealthResponse {
  status: string;
  message?: string;
  timestamp?: string;
  db?: { status: string };
  qdrant?: { status: string };
  llm?: { status: string };
}

/**
 * Hook: Get Objects from Core API
 * Fetches objects from /v1/objects endpoint
 */
export function useMemoryFacts(
  params?: ObjectQueryParams,
  options?: Partial<UseQueryOptions<MoraObject[]>>
) {
  return useQuery<MoraObject[]>({
    queryKey: ['objects', params ?? {}],
    queryFn: async () => {
      try {
        const response = await api.getObjects(params);
        // Core API returns: { objects: [...], total: number }
        return response.objects || [];
      } catch (error) {
        console.error('Failed to fetch objects:', error);
        return [];
      }
    },
    ...options,
  });
}


/**
 * Hook: Get Snapshots for Timeline
 * Fetches 3 snapshots (t0, t1, t2) from Core API /v1/snapshots
 */
export function useSnapshots() {
  return useQuery<Snapshot[]>({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const response = await api.getSnapshots();
      if (!response.snapshots || response.snapshots.length === 0) {
        throw new Error('Snapshots response empty');
      }
      return response.snapshots;
    },
    placeholderData: [],
    retry: 2,
  });
}

/**
 * Hook: Execute Workflow
 * Triggers n8n workflow execution
 */
export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: async ({ workflowId, params }: { workflowId: string; params: Record<string, any> }) => {
      // Get webhook URL from env
      const webhookUrls: Record<string, string> = {
        email_digest: process.env.NEXT_PUBLIC_N8N_EMAIL_DIGEST || '',
        broadcast_doc: process.env.NEXT_PUBLIC_N8N_BROADCAST_DOC || '',
        duplicate_hunter: process.env.NEXT_PUBLIC_N8N_DUPLICATE_HUNTER || '',
      };

      const webhookUrl = webhookUrls[workflowId];

      // Graceful fallback: Simulate workflow execution if no webhook configured
      if (!webhookUrl) {
        console.warn(`⚠️ No webhook URL configured for workflow: ${workflowId}. Simulating execution...`);

        // Return simulated success response
        return {
          success: true,
          simulated: true,
          workflowId,
          message: `Workflow '${workflowId}' executed in simulation mode (no webhook URL configured)`,
          timestamp: new Date().toISOString(),
          params
        };
      }

      // Execute real webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

/**
 * Hook: Broadcast Message
 * Creates a broadcast/reference to other users
 */
export function useBroadcast() {
  return useMutation({
    mutationFn: async (data: { sourceId: string; targetIds: string[]; message: string }) => {
      return api.broadcast(data);
    },
  });
}

/**
 * Hook: Health Check
 * Checks if the Core API is accessible
 */
export function useHealthCheck() {
  return useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      try {
        const result = await api.health();
        return {
          ...result,
          timestamp: result.timestamp ?? new Date().toISOString(),
        };
      } catch (error) {
        console.error('Health check failed:', error);
        return {
          status: 'error',
          message: 'API not reachable',
          timestamp: new Date().toISOString(),
        };
      }
    },
    // Check every 60 seconds
    refetchInterval: 60000,
  });
}

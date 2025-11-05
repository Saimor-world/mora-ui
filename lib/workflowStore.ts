import { create } from 'zustand';
import type { RunTrace } from './types';

// n8n Workflow Definitions
export interface WorkflowDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  params: Array<{
    name: string;
    type: 'text' | 'date' | 'select';
    label: string;
    required?: boolean;
    options?: string[];
  }>;
}

export const workflows: WorkflowDef[] = [
  {
    id: 'email_digest',
    name: 'Email Digest',
    description: 'Generate email digest for a time period',
    icon: '📧',
    color: '#60A5FA',
    params: [
      { name: 'startTs', type: 'date', label: 'Start Date', required: true },
      { name: 'endTs', type: 'date', label: 'End Date', required: true },
      { name: 'spaceId', type: 'text', label: 'Space ID (optional)' },
    ],
  },
  {
    id: 'broadcast_doc',
    name: 'Broadcast Document',
    description: 'Share document across multiple spaces',
    icon: '📡',
    color: '#F5B800',
    params: [
      { name: 'sourceId', type: 'text', label: 'Source Object ID', required: true },
      { name: 'targetIds', type: 'text', label: 'Target Space IDs (comma-separated)', required: true },
      { name: 'message', type: 'text', label: 'Message' },
    ],
  },
  {
    id: 'duplicate_hunter',
    name: 'Duplicate Hunter',
    description: 'Find duplicate objects in a space',
    icon: '🔍',
    color: '#34D399',
    params: [
      { name: 'spaceId', type: 'text', label: 'Space ID', required: true },
      { name: 'threshold', type: 'select', label: 'Similarity Threshold', options: ['80%', '90%', '95%'] },
    ],
  },
];

interface WorkflowStore {
  activeRuns: Map<string, RunTrace>;
  addRun: (runId: string, trace: RunTrace) => void;
  updateRun: (runId: string, trace: Partial<RunTrace>) => void;
  clearRun: (runId: string) => void;
  clearAll: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  activeRuns: new Map(),

  addRun: (runId, trace) => set((state) => {
    const newRuns = new Map(state.activeRuns);
    newRuns.set(runId, trace);
    return { activeRuns: newRuns };
  }),

  updateRun: (runId, updates) => set((state) => {
    const newRuns = new Map(state.activeRuns);
    const existing = newRuns.get(runId);
    if (existing) {
      newRuns.set(runId, { ...existing, ...updates });
    }
    return { activeRuns: newRuns };
  }),

  clearRun: (runId) => set((state) => {
    const newRuns = new Map(state.activeRuns);
    newRuns.delete(runId);
    return { activeRuns: newRuns };
  }),

  clearAll: () => set({ activeRuns: new Map() }),
}));

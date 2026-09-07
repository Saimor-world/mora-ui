import { coreGet } from '@/lib/api/http';

export type EngineWorldContract = {
  contract: 'saimor.engine.world';
  version: string;
  engine: {
    id: string;
    world_id: string;
    truth_source: 'core';
    mora_role: 'server_context_layer';
  };
  world: {
    profile: string;
    palette: {
      base: string;
      deep: string;
      void: string;
      violet_rgb: string;
      indigo_rgb: string;
      cyan_rgb: string;
    };
    motion: {
      policy: string;
      reduced_motion: string;
    };
  };
  os: {
    id: 'saimor-os';
    role: 'operating_system';
    presentation: {
      ambient_intensity: number;
    };
  };
  service_boundaries: Record<string, string>;
};

export const DEFAULT_ENGINE_WORLD_CONTRACT: EngineWorldContract = {
  contract: 'saimor.engine.world',
  version: '0',
  engine: {
    id: 'saimor-engine',
    world_id: 'saimor',
    truth_source: 'core',
    mora_role: 'server_context_layer',
  },
  world: {
    profile: 'deep-space-v1',
    palette: {
      base: '#0d0921',
      deep: '#05080e',
      void: '#03050a',
      violet_rgb: '110, 38, 160',
      indigo_rgb: '20, 33, 140',
      cyan_rgb: '10, 110, 160',
    },
    motion: {
      policy: 'capability-gated',
      reduced_motion: 'off',
    },
  },
  os: {
    id: 'saimor-os',
    role: 'operating_system',
    presentation: {
      ambient_intensity: 1,
    },
  },
  service_boundaries: {
    files: 'deterministic',
    mail: 'deterministic',
    messages: 'deterministic',
    calendar: 'deterministic',
    mora: 'context_and_intelligence',
  },
};

export function isEngineWorldContract(value: unknown): value is EngineWorldContract {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EngineWorldContract>;
  return candidate.contract === 'saimor.engine.world'
    && typeof candidate.version === 'string'
    && candidate.engine?.truth_source === 'core'
    && typeof candidate.world?.profile === 'string'
    && typeof candidate.world?.palette?.base === 'string'
    && candidate.os?.id === 'saimor-os'
    && candidate.os?.role === 'operating_system'
    && typeof candidate.os?.presentation?.ambient_intensity === 'number';
}

export async function loadEngineWorldContract(): Promise<EngineWorldContract> {
  const payload = await coreGet('/v1/engine/world', { skipAuth: true, isOptional: true });
  const candidate = payload && typeof payload === 'object' && 'data' in payload
    ? payload.data
    : payload;

  return isEngineWorldContract(candidate) ? candidate : DEFAULT_ENGINE_WORLD_CONTRACT;
}

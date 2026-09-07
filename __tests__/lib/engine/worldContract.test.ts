import { coreGet } from '@/lib/api/http';
import {
  DEFAULT_ENGINE_WORLD_CONTRACT,
  loadEngineWorldContract,
} from '@/lib/engine/worldContract';

jest.mock('@/lib/api/http', () => ({
  coreGet: jest.fn(),
}));

const mockedCoreGet = coreGet as jest.MockedFunction<typeof coreGet>;

describe('Saimôr Engine world contract', () => {
  beforeEach(() => {
    mockedCoreGet.mockReset();
  });

  it('pins Desk as the default workspace inside one Saimôr OS', () => {
    expect(DEFAULT_ENGINE_WORLD_CONTRACT.os.role).toBe('operating_system');
    expect(DEFAULT_ENGINE_WORLD_CONTRACT.os.default_workspace).toBe('desk');
    expect(DEFAULT_ENGINE_WORLD_CONTRACT.os.workspaces.desk.role).toBe('default_workspace');
    expect('surfaces' in DEFAULT_ENGINE_WORLD_CONTRACT).toBe(false);
  });

  it('boots from the local Stand 0 contract when CORE is unavailable', async () => {
    mockedCoreGet.mockResolvedValue(null);

    await expect(loadEngineWorldContract()).resolves.toEqual(DEFAULT_ENGINE_WORLD_CONTRACT);
    expect(mockedCoreGet).toHaveBeenCalledWith('/v1/engine/world', {
      skipAuth: true,
      isOptional: true,
    });
  });

  it('accepts the canonical CORE envelope', async () => {
    const contract = {
      ...DEFAULT_ENGINE_WORLD_CONTRACT,
      version: '0-test',
    };
    mockedCoreGet.mockResolvedValue({ data: contract, meta: { api_version: 'v1' } });

    await expect(loadEngineWorldContract()).resolves.toEqual(contract);
  });
});

import { describeMoraEngine } from '@/lib/mora/describeMoraEngine';

test('returns null when no field provider is selected', () => {
  expect(describeMoraEngine({ provider_management: { field_planner: { selected_provider: null } } })).toBeNull();
  expect(describeMoraEngine({})).toBeNull();
  expect(describeMoraEngine(null)).toBeNull();
});

test('describes a cloud provider with the actually-used model + US residency', () => {
  const engine = describeMoraEngine({
    provider_management: {
      field_planner: { selected_provider: 'gemini', models: { gemini: 'gemini-2.5-flash' } },
      field_usage: { recent: [{ provider: 'gemini', model: 'gemini-2.5-flash' }] },
      providers: { gemini: { residency: 'us' } },
    },
  });
  expect(engine).toEqual({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    residency: 'us',
    label: 'Gemini · gemini-2.5-flash',
  });
});

test('marks a local Ollama provider as EU/local', () => {
  const engine = describeMoraEngine({
    provider_management: {
      field_planner: { selected_provider: 'ollama' },
      field_usage: { recent: [{ provider: 'ollama', model: 'qwen2.5:7b' }] },
      providers: { ollama: { residency: 'local' } },
    },
  });
  expect(engine).toEqual({
    provider: 'ollama',
    model: 'qwen2.5:7b',
    residency: 'local',
    label: 'Lokal (EU) · qwen2.5:7b',
  });
});

test('falls back to the configured model when no recent usage exists', () => {
  const engine = describeMoraEngine({
    provider_management: {
      field_planner: { selected_provider: 'anthropic', models: { anthropic: 'claude-3-5-haiku' } },
      field_usage: { recent: [] },
      providers: { anthropic: { residency: 'us' } },
    },
  });
  expect(engine?.model).toBe('claude-3-5-haiku');
  expect(engine?.label).toBe('Claude · claude-3-5-haiku');
});

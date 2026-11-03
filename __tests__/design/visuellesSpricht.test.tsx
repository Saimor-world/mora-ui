/**
 * Gestaltungsgesetz „Visuelles spricht, Text schweigt“ (Marius, 03.11.2026):
 * keine Begrüßungs-Monologe, keine Offline-Tafeln, keine Selbstgespräche von MÔRA.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/os/useScopedToday', () => ({
  useScopedToday: () => ({ snapshot: null, loading: false, loadError: null, refresh: jest.fn(), refreshing: false }),
}));

import { BridgeConcept } from '@/components/os-shell/BridgeConcept';
import { moraLine } from '@/lib/mora/bridgeData';

const ROOT = path.resolve(__dirname, '../..');
const HQ_COPY_FILES = [
  'features/home/cockpit/LiveCockpit.tsx',
  'features/home/widgets/HomeOverview.tsx',
  'components/os-shell/BridgeConcept.tsx',
  'lib/mora/bridgeData.ts',
  'features/mora/ui/MoraStage.tsx',
  'features/mora/ui/MoraConsole.tsx',
  'components/os/shell/ShellStatusScreens.tsx',
  'components/auth/WelcomeScreen.tsx',
  'components/mora/MoraGreetingBubble.tsx',
  'components/mora/AmbientVoicePill.tsx',
];
const BANNED = [
  /Quellen sind derzeit nicht verfügbar/,
  /Alles erledigt\./,
  /noch nicht angedockt/i,
  /Bitte verbinden/i,
  /Quelle verbinden/,
  /Môra hört zu|MÔRA ist wach und hört zu/i,
  /Ich sammle gerade deinen Tag/,
  /Ich behalte den Tag im Blick/,
  /Frag mich was/i,
  /Frag MÔRA …|Frag weiter …|MÔRA fragen…/,
  /Noch kein Stand/,
  /MÔRA\$\{scene|MÔRA · (Morgen|Mittag|Nachmittag|Abend|Nacht)/,
];

describe('Visuelles spricht, Text schweigt', () => {
  it.each(HQ_COPY_FILES)('%s enthält keine verbotenen Floskeln', (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const re of BANNED) expect({ file, hit: src.match(re)?.[0] ?? null }).toEqual({ file, hit: null });
  });

  it('MÔRA-Eingabe zeigt nur „MÔRA“ als Platzhalter', () => {
    for (const f of ['features/mora/ui/MoraStage.tsx', 'features/mora/ui/MoraConsole.tsx']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const ph = [...src.matchAll(/placeholder=(?:"([^"]*)"|\{([^}]*)\})/g)].map((m) => m[1] ?? m[2]);
      expect(ph).toEqual(['MÔRA']);
    }
  });

  it('MÔRA führt keine Selbstgespräche, solange keine Daten da sind', () => {
    expect(moraLine(null, 600)).toBe('');
  });

  it('Unverbundene Quellen sind stille Dock-Buchten ohne „Offline“-Text', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <BridgeConcept items={[]} activeId="home" onNavigate={jest.fn()} onMora={jest.fn()} onMore={jest.fn()} onNotifications={jest.fn()} onSearch={jest.fn()} mood="idle" moraOpen={false} attention={0} phone={false} showLegacy={false} />
      </QueryClientProvider>
    );
    for (const id of ['post', 'today', 'team', 'next']) {
      const bay = screen.getByTestId(`dock-bay-${id}`);
      expect(bay.textContent).toBe('');
      expect(within(bay).getByRole('button')).toHaveAttribute('aria-label');
    }
    const deck = container.querySelector('.bridge__deck')!;
    expect(deck.textContent).not.toMatch(/offline|angedockt|nicht verbunden/i);
    expect(within(screen.getByTestId('dock-ask-open')).getByText('MÔRA')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookOpen, Building2, Hammer, Mail, ShieldCheck, Wallet } from 'lucide-react';
import { planetGlyph } from '@/components/universe/OrganizationField';
import { MOTION } from '@/lib/universe/motion';

jest.mock('@/lib/universe/morgen', () => ({ ...jest.requireActual('@/lib/universe/morgen'), isUniverseV2Enabled: () => true }));
jest.mock('@/lib/hooks/useConnectionStatus', () => ({ useConnectionStatus: () => ({ status: 'error', retry: jest.fn(), lastConnected: null }) }));
jest.mock('@/lib/hooks/useSurfaceProfile', () => ({ useSurfaceProfile: () => ({ isLocalTruthSurface: true, isPublicDemoSurface: false }) }));
jest.mock('@/lib/hooks/useWebsiteEntryContext', () => ({ useWebsiteEntryContext: () => null }));

describe('Universe v2 – tiefer Durchgang', () => {
  it('jeder Planet bekommt sein eigenes Zeichen', () => {
    expect(planetGlyph('Finanzen')).toBe(Wallet);
    expect(planetGlyph('Post & Termine')).toBe(Mail);
    expect(planetGlyph('Werkstatt')).toBe(Hammer);
    expect(planetGlyph('Wissen')).toBe(BookOpen);
    expect(planetGlyph('Wache')).toBe(ShieldCheck);
    expect(planetGlyph('Vertrieb')).toBe(Building2);
  });

  it('ein Bewegungssystem: Auftritte in fester Reihenfolge', () => {
    const s = MOTION.stagger;
    expect(s.greeting).toBeLessThan(s.constellation);
    expect(s.constellation).toBeLessThan(s.comet);
    expect(s.comet).toBeLessThan(s.proposal);
    expect(s.proposal).toBeLessThan(s.ask);
    expect(MOTION.ease.out).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('Verbindungsstörung ist ein leiser Punkt, kein Banner über der Kopfleiste', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ConnectionBanner } = require('@/components/ui/ConnectionBanner');
    render(<ConnectionBanner />);
    expect(screen.getByTestId('uv2-connection')).toHaveTextContent('Verbindung gestört');
    expect(screen.queryByText(/Interne Instanz/)).toBeNull();
  });
});

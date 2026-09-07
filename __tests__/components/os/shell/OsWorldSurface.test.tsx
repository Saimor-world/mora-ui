import React from 'react';
import { render, screen } from '@testing-library/react';
import { OsWorldSurface } from '@/components/os/shell/OsWorldSurface';

jest.mock('next/dynamic', () => () => function HeavyLayer(props: { density?: string; count?: number }) {
    return <div data-testid="heavy" data-density={props.density} data-count={props.count} />;
});
jest.mock('@/components/os/shell/ShellStaticBackdrop', () => ({ ShellStaticBackdrop: () => <div data-testid="static" /> }));
jest.mock('@/components/mora/MoraLivingBackground', () => ({ MoraLivingBackground: () => null }));
jest.mock('@/components/os/RitualSceneStyler', () => ({ RitualSceneStyler: () => null }));
jest.mock('@/components/os/TemporalAtmosphere', () => ({ TemporalAtmosphere: ({ paused }: { paused: boolean }) => <div data-testid="temporal" data-paused={paused} /> }));

const props = { orbState: 'idle' as const, demoMode: false, explore: false, paused: false, heavyReady: false, density: 'medium' as const };

test('first paint contains the static backdrop without heavy layers', () => {
    render(<OsWorldSurface {...props} />);
    expect(screen.getByTestId('static')).toBeInTheDocument();
    expect(screen.queryAllByTestId('heavy')).toHaveLength(0);
    expect(screen.getByTestId('temporal')).toHaveAttribute('data-paused', 'true');
});
test('pausing unmounts heavy layers while preserving the backdrop', () => {
    const { rerender } = render(<OsWorldSurface {...props} heavyReady />);
    expect(screen.getAllByTestId('heavy')).toHaveLength(5);
    rerender(<OsWorldSurface {...props} heavyReady paused />);
    expect(screen.queryAllByTestId('heavy')).toHaveLength(0);
    expect(screen.getByTestId('static')).toBeInTheDocument();
});
test('exploration uses reduced particles instead of duplicating the full scene', () => {
    render(<OsWorldSurface {...props} heavyReady explore />);
    expect(screen.getAllByTestId('heavy').find(el => el.dataset.density)).toHaveAttribute('data-density', 'low');
    expect(screen.getAllByTestId('heavy').find(el => el.dataset.count)).toHaveAttribute('data-count', '8');
});

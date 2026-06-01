import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FinderInitiativeLane } from '@/components/panes/FinderInitiativeLane';
import type { InitiativeSummary } from '@/lib/openflow/types';

const initiatives: InitiativeSummary[] = [
  { id: 'initiative-website-relaunch', title: 'Website Relaunch', signalCount: 2, riskCount: 1, decisionCount: 0, sourceKinds: ['cloud'] },
];

describe('FinderInitiativeLane', () => {
  it('renders nothing when there are no initiatives', () => {
    const { container } = render(
      <FinderInitiativeLane initiatives={[]} onOpenInUniverse={jest.fn()} onAddToInitiative={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each initiative with its signal count', () => {
    render(<FinderInitiativeLane initiatives={initiatives} onOpenInUniverse={jest.fn()} onAddToInitiative={jest.fn()} />);
    expect(screen.getByText('Website Relaunch')).toBeInTheDocument();
    expect(screen.getByText('2 Signale')).toBeInTheDocument();
  });

  it('calls onOpenInUniverse when the map button is clicked', () => {
    const onOpenInUniverse = jest.fn();
    render(<FinderInitiativeLane initiatives={initiatives} onOpenInUniverse={onOpenInUniverse} onAddToInitiative={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /In Universe öffnen/ }));
    expect(onOpenInUniverse).toHaveBeenCalled();
  });

  it('calls onAddToInitiative with the initiative id', () => {
    const onAddToInitiative = jest.fn();
    render(<FinderInitiativeLane initiatives={initiatives} onOpenInUniverse={jest.fn()} onAddToInitiative={onAddToInitiative} />);
    fireEvent.click(screen.getByRole('button', { name: /Zu Initiative hinzufügen/ }));
    expect(onAddToInitiative).toHaveBeenCalledWith('initiative-website-relaunch');
  });
});

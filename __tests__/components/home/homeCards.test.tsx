import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeChip, HomeCommandButton, HomeSignalCard, HomeMiniAction, SuggestionCard, DeptPlanetTile } from '@/components/home/homeCards';

describe('HomeChip', () => {
  it('shows label and value', () => {
    render(<HomeChip label="Bereiche" value={7} />);
    expect(screen.getByText('Bereiche')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('HomeCommandButton', () => {
  it('renders label/detail and fires onClick', () => {
    const onClick = jest.fn();
    render(<HomeCommandButton label="Finder" detail="Dateien" tone="emerald" onClick={onClick} dataTestId="cmd" />);
    expect(screen.getByText('Finder')).toBeInTheDocument();
    expect(screen.getByText('Dateien')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cmd'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('HomeSignalCard', () => {
  it('renders title + detail and fires onClick', () => {
    const onClick = jest.fn();
    render(<HomeSignalCard icon={<i />} label="l" title="Neue Mail" detail="von X" tone="cyan" onClick={onClick} />);
    expect(screen.getByText('Neue Mail')).toBeInTheDocument();
    expect(screen.getByText('von X')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('HomeMiniAction', () => {
  it('renders label and fires onClick', () => {
    const onClick = jest.fn();
    render(<HomeMiniAction icon={<i />} label="Mehr" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Mehr/ }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('SuggestionCard', () => {
  it('renders content and fires onClick from the action', () => {
    const onClick = jest.fn();
    render(<SuggestionCard title="Mail verbinden" description="Postfach koppeln" actionText="Verbinden" icon={<i />} tone="cyan" onClick={onClick} />);
    expect(screen.getByText('Mail verbinden')).toBeInTheDocument();
    expect(screen.getByText('Postfach koppeln')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Verbinden/ }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('DeptPlanetTile', () => {
  it('shows the content count when active', () => {
    render(<DeptPlanetTile dept={{ id: 'd1', name: 'Vertrieb' }} count={3} active loaded colorIdx={0} onClick={jest.fn()} />);
    expect(screen.getByText('Vertrieb')).toBeInTheDocument();
    expect(screen.getByText('3 Inhalte')).toBeInTheDocument();
  });

  it('shows "ruhig" when inactive but loaded, and fires onClick', () => {
    const onClick = jest.fn();
    render(<DeptPlanetTile dept={{ id: 'd2', name: 'HR' }} count={0} active={false} loaded colorIdx={1} onClick={onClick} />);
    expect(screen.getByText('ruhig')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dept-tile-d2'));
    expect(onClick).toHaveBeenCalled();
  });
});

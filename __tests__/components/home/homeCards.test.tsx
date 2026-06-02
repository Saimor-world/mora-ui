import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeChip, HomeCommandButton, HomeSignalCard, HomeMiniAction } from '@/components/home/homeCards';

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

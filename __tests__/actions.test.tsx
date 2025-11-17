import React from 'react';
import { render, screen } from '@testing-library/react';
import { computeActions } from '@/lib/mind/actions';
import ActionsCard from '@/components/home/ActionsCard';

describe('computeActions', () => {
  it('classifies anomalies as risks and attaches targets', () => {
    const actions = computeActions([
      { id: 'a', type: 'anomaly', severity: 0.95, entity_id: 'n1', title: 'Peak' },
    ]);
    expect(actions[0].kind).toBe('risk');
    expect(actions[0].targetNodeId).toBe('n1');
  });

  it('derives focus from tag clusters', () => {
    const actions = computeActions([
      { id: 'a', type: 'semantic', tags: ['umsatz'], entity_id: 'n1' },
      { id: 'b', type: 'semantic', tags: ['umsatz'], entity_id: 'n2' },
    ]);
    expect(actions.some((a) => a.kind === 'focus')).toBe(true);
  });
});

describe('ActionsCard', () => {
  it('renders fallback when no actions exist', () => {
    render(<ActionsCard items={[]} />);
    expect(screen.getByText(/Gerade keine Hinweise/i)).toBeInTheDocument();
  });

  it('renders actions list when present', () => {
    render(
      <ActionsCard
        items={[
          { id: 'a', type: 'anomaly', entity_id: 'n1', severity: 0.9 },
          { id: 'b', type: 'opportunity', entity_id: 'n2' },
        ]}
      />
    );
    expect(screen.getAllByText(/Hinweise/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
  });
});

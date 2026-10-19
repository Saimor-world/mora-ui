import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GlassPanel } from '@/components/layers/GlassPanel';

it('focuses the source before a child launches its destination, without raising the source afterwards', () => {
  const actions: string[] = [];
  render(<GlassPanel title="Wissen" isActive={false} onFocus={() => actions.push('focus-source')}>
    <button type="button" onClick={() => actions.push('open-document')}>Dokument öffnen</button>
  </GlassPanel>);
  const button = screen.getByRole('button', { name: 'Dokument öffnen' });
  fireEvent.pointerDown(button);
  fireEvent.click(button);
  expect(actions).toEqual(['focus-source', 'open-document']);
});

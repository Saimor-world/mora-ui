import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlassPanel } from '@/components/layers/GlassPanel';

describe('GlassPanel resize handle', () => {
  it('sits above the scrolling content so it can be grabbed', () => {
    render(<GlassPanel title="Notizen" resizable><div>Inhalt</div></GlassPanel>);
    const handle = screen.getByTestId('pane-resize-handle');
    // The content layer is absolute inset-0 and comes later in the DOM; without a z-index it covered the handle.
    expect(handle.className).toMatch(/\bz-30\b/);
  });
});

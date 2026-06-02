import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModeIndicatorBanner } from '@/components/os/shell/ModeIndicatorBanner';

describe('ModeIndicatorBanner', () => {
  it('renders nothing for the real HQ mode', () => {
    const { container } = render(<ModeIndicatorBanner activeMode="real_hq" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the matching badge text per mode', () => {
    const cases: Array<[any, string]> = [
      ['public_playground', 'Website-HQ / Public Playground'],
      ['personal_demo', 'Personal Demo'],
      ['private_preview', 'Private Preview'],
      ['visitor', 'Visitor'],
    ];
    for (const [mode, badge] of cases) {
      const { unmount } = render(<ModeIndicatorBanner activeMode={mode} />);
      expect(screen.getByText(badge)).toBeInTheDocument();
      unmount();
    }
  });

  it('explains the visitor mode context', () => {
    render(<ModeIndicatorBanner activeMode="visitor" />);
    expect(screen.getByText(/Security Scan/)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import Timeline from '@/components/canvas/FieldMode/Timeline';

describe('Timeline', () => {
  it('renders snapshot labels and current badge', () => {
    const snapshots = ['2025-11-01T00:00:00Z', '2025-11-02T00:00:00Z', '2025-11-03T00:00:00Z'];
    render(<Timeline snapshots={snapshots} current={1} onChange={() => undefined} />);
    expect(screen.getByLabelText(/Snapshot t1/i)).toBeInTheDocument();
    expect(screen.getByText(snapshots[1])).toBeInTheDocument();
  });
});

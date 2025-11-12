import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventDetailDrawer from '@/components/home/EventDetailDrawer';
import type { MoraEvent } from '@/lib/mora/listener';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('EventDetailDrawer', () => {
  it('applies tag chip navigation', async () => {
    const user = userEvent.setup();
    const event: MoraEvent = {
      action: 'filter_change',
      ts: Date.now(),
      payload: { tag: 'finance' },
    };

    render(<EventDetailDrawer open event={event} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /#finance/i }));
    expect(push).toHaveBeenCalledWith('/folder?tag=finance');
  });
});

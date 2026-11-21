import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NeedsYou } from '@/features/today/ui/OwlCard';

it('lets the phone user expand the list and open the fifth source', () => {
  const mails = Array.from({ length: 5 }, (_, i) => ({ id: String(i), subject: 'Beleg ' + i, kind: 'bill' }));
  const open = jest.fn();
  render(<NeedsYou mails={mails} onOpen={open} />);
  expect(screen.queryByText('Beleg 4')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Alle anzeigen' }));
  fireEvent.click(screen.getByText('Beleg 4'));
  expect(open).toHaveBeenCalledWith(mails[4]);
  fireEvent.click(screen.getByRole('button', { name: 'Weniger anzeigen' }));
  expect(screen.queryByText('Beleg 4')).toBeNull();
});

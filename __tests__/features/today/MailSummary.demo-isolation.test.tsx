import React from 'react';
import { render } from '@testing-library/react';
import { MailSummaryView } from '@/features/today/ui/MailSummary';
import { useDemoScopeActive } from '@/lib/demo/demoSourceGuard';
import { useMailSummary } from '@/lib/os-prototype/mailSummary';

jest.mock('@/lib/demo/demoSourceGuard', () => ({ useDemoScopeActive: jest.fn() }));
jest.mock('@/lib/os-prototype/mailSummary', () => ({ useMailSummary: jest.fn() }));

const demoScope = useDemoScopeActive as jest.MockedFunction<typeof useDemoScopeActive>;
const mailQuery = useMailSummary as jest.MockedFunction<typeof useMailSummary>;

beforeEach(() => {
  jest.clearAllMocks();
  mailQuery.mockReturnValue({ isLoading: false, isError: false, data: null } as ReturnType<typeof useMailSummary>);
});

it('never enables personal mail summary queries in demo scope', () => {
  demoScope.mockReturnValue(true);
  const { container } = render(<MailSummaryView enabled variant="full" />);
  expect(mailQuery).toHaveBeenCalledWith(false);
  expect(container).toBeEmptyDOMElement();
});

it('continues to enable personal mail summaries outside demos', () => {
  demoScope.mockReturnValue(false);
  render(<MailSummaryView enabled variant="signal" />);
  expect(mailQuery).toHaveBeenCalledWith(true);
});

it('keeps the mail summary query disabled when the parent is disabled', () => {
  demoScope.mockReturnValue(false);
  const { container } = render(<MailSummaryView enabled={false} />);
  expect(mailQuery).toHaveBeenCalledWith(false);
  expect(container).toBeEmptyDOMElement();
});

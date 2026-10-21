import React from 'react';
import { render, screen } from '@testing-library/react';
import { StateView, FailureState, Loading, stateForFailure, type OsStateKind } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { CoreError } from '@/lib/api/http';

describe('shared OS states', () => {
  const kinds: OsStateKind[] = ['empty', 'error', 'offline', 'backend_unavailable', 'permission_denied', 'not_configured', 'feature_unavailable'];
  it.each(kinds)('renders %s with a title and data-state', (kind) => {
    const { container } = render(<StateView kind={kind} />);
    const el = container.querySelector(`[data-state="${kind}"]`);
    expect(el).not.toBeNull();
    expect(el!.textContent!.length).toBeGreaterThan(10);
  });

  it('uses alert role for error and permission states', () => {
    render(<StateView kind="permission_denied" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders loading as a polite status', () => {
    render(<Loading label="Lädt Finance" />);
    expect(screen.getByRole('status')).toHaveTextContent('Lädt Finance');
  });

  it('classifies CORE failures', () => {
    expect(classifyCoreFailure(new CoreError('', 401))).toBe('unauthenticated');
    expect(classifyCoreFailure(new CoreError('', 403))).toBe('denied');
    expect(classifyCoreFailure(new CoreError('', 404))).toBe('contract_missing');
    expect(classifyCoreFailure(new CoreError('', 503))).toBe('offline');
    expect(classifyCoreFailure(new CoreError('', 500))).toBe('backend_error');
    expect(classifyCoreFailure(new TypeError('fetch failed'))).toBe('offline');
    expect(stateForFailure('contract_missing')).toBe('backend_unavailable');
  });

  it('FailureState offers retry only for transient failures', () => {
    const retry = jest.fn();
    const { rerender } = render(<FailureState kind="offline" onRetry={retry} />);
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
    rerender(<FailureState kind="denied" onRetry={retry} />);
    expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull();
  });
});

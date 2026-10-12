import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DepartmentPlanning from '@/apps/finance-v2/DepartmentPlanning';

describe('department planning interface', () => {
  it('requires explicit reserve and budget before showing any runway', () => {
    render(<DepartmentPlanning />);
    expect(screen.getByRole('status').textContent).toContain('Reserve und Monatsbetrag ergänzen');
    fireEvent.change(screen.getByLabelText('Geschützte Reserve in USD'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('Monatlicher Einsatz in USD'), { target: { value: '100' } });
    expect(screen.getByRole('status').textContent).toContain('6 volle Monate');
    expect(screen.getByText('Szenario · kein verfügbares Guthaben')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('blocks an over-budget scenario instead of showing misleading runway', () => {
    render(<DepartmentPlanning />);
    fireEvent.change(screen.getByLabelText('Geschützte Reserve in USD'), { target: { value: '3500' } });
    fireEvent.change(screen.getByLabelText('Monatlicher Einsatz in USD'), { target: { value: '101' } });
    expect(screen.getByRole('status').textContent).toContain('übersteigt das Kapital');
    expect(screen.getByRole('status').textContent).not.toContain('volle Monate');
  });
});

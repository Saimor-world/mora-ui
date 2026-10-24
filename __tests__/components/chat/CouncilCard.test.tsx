import React from 'react';
import { render, screen } from '@testing-library/react';
import { CouncilCard } from '@/components/chat/CouncilCard';

describe('CouncilCard', () => {
  it('zeigt Stimmen, markiert Widerspruch und hat keine Aktions-Knöpfe', () => {
    render(
      <CouncilCard
        council={{
          question: 'q', verdict: 'dafür', consensus: false, summary: 'Mehrheit: dafür (2/3).',
          dissentRoles: ['customer'],
          voices: [
            { role: 'product', label: 'Produkt', stance: 'dafür', advice: 'Gut.', risks: [], available: true },
            { role: 'customer', label: 'Kunde', stance: 'dagegen', advice: 'Zu viel.', risks: ['Abbruch'], available: true },
            { role: 'finance', label: 'Finanzen', stance: 'unklar', advice: '', risks: [], available: false },
          ],
        }}
      />,
    );
    expect(screen.getByText('Mehrheit: dafür (2/3).')).toBeInTheDocument();
    expect(screen.getByTestId('council-voice-customer')).toHaveTextContent('Widerspruch');
    expect(screen.getByTestId('council-voice-finance')).toHaveTextContent('ohne Antwort');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MoraAsk } from '@/components/world/MoraAsk';

const sendMessage = jest.fn();
const getError = jest.fn();
jest.mock('@/lib/hooks/useMoraStream', () => ({ useMoraStream: () => ({ isStreaming: false, streamingText: '', messages: [], sendMessage, getError }) }));
jest.mock('@/components/os-kit', () => ({ MoraStone: () => null }));
const ctx = { tasks: [], planets: [], todayEvents: [{ id: 'e1', title: 'Termin – Beispiel', date: '2026-10-24' }] };
const props = { ctx, dayContext: { company_id: 'example-company' }, fallback: 'Ein Termin steht an.' };
const ask = (text: string) => {
  fireEvent.change(screen.getByTestId('world-ask-input'), { target: { value: text } });
  fireEvent.submit(screen.getByTestId('world-ask-input').closest('form')!);
};
beforeEach(() => { jest.clearAllMocks(); getError.mockReturnValue(null); });

it('shows the CORE answer and passes the selected company context', async () => {
  sendMessage.mockResolvedValue('Antwort aus dem CORE-Stream');
  render(<MoraAsk {...props} onCommand={jest.fn()} />);
  ask('Wie war die Woche?');
  await screen.findByText('Antwort aus dem CORE-Stream');
  expect(sendMessage).toHaveBeenCalledWith('Wie war die Woche?', expect.objectContaining({ context: { company_id: 'example-company' } }));
});

it('does not diagnose a missing model from a transport/authentication failure', async () => {
  sendMessage.mockResolvedValue(''); getError.mockReturnValue('401');
  render(<MoraAsk {...props} onCommand={jest.fn()} />);
  ask('Wie war die Woche?');
  await screen.findByText(/keine vollständige Antwort geliefert/);
  expect(screen.queryByText(/erreicht kein Sprachmodell/)).toBeNull();
});

it('waits for the action and does not announce a failed undo as successful', async () => {
  let complete!: (value: unknown) => void;
  const undo = jest.fn().mockResolvedValue(false);
  const onCommand = jest.fn().mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  render(<MoraAsk {...props} onCommand={onCommand} />);
  ask('Beispiel ist da');
  expect(screen.getByTestId('world-ask-send')).toBeDisabled();
  expect(screen.queryByTestId('mora-undo')).toBeNull();
  await act(async () => { complete({ text: 'Termin läuft.', tone: 'action', undo }); });
  fireEvent.click(await screen.findByTestId('mora-undo'));
  await screen.findByText(/Rückgängig nicht gespeichert/);
  expect(screen.queryByText('Rückgängig gemacht.')).toBeNull();
});

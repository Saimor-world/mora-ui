import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MoraAsk, type MoraReply } from '@/components/world/MoraAsk';

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

it('does not display the new success mood before the action is confirmed', async () => {
  let complete!: (value: MoraReply) => void;
  const outcome = jest.fn();
  render(<MoraAsk {...props} onOutcome={outcome} onCommand={() => new Promise(resolve => { complete = resolve; })} />);
  ask('Beispiel ist da');
  expect(outcome).not.toHaveBeenCalled();
  await act(async () => { complete({ text: 'Nicht gespeichert.', tone: 'note' }); });
  expect(outcome).toHaveBeenCalledWith(false);
  expect(outcome).not.toHaveBeenCalledWith(true);
});

it('does not send an old outcome into the next surface after unmount', async () => {
  let complete!: (value: MoraReply) => void;
  const outcome = jest.fn();
  const { unmount } = render(<MoraAsk {...props} onOutcome={outcome} onCommand={() => new Promise(resolve => { complete = resolve; })} />);
  ask('Beispiel ist da'); unmount();
  await act(async () => { complete({ text: 'Gespeichert.', tone: 'action' }); });
  expect(outcome).not.toHaveBeenCalled();
});

it('stops the speech recognizer and removes its callback when the surface closes', () => {
  const recognition = { lang: '', onresult: null, onend: null, start: jest.fn(), stop: jest.fn() };
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: jest.fn(() => recognition) });
  try {
    const { unmount } = render(<MoraAsk {...props} onCommand={jest.fn()} />);
    fireEvent.click(screen.getByTestId('world-ask-mic'));
    expect(recognition.start).toHaveBeenCalled(); unmount();
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(recognition.onresult).toBeNull();
  } finally {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  }
});

import { conversationHistory } from '@/lib/mora/conversationHistory';
it('carries the dialogue while excluding the current separately submitted message and UI placeholders', () => {
  expect(conversationHistory([
    { id: 'welcome', role: 'assistant', content: 'hello' },
    { id: 'one', role: 'user', content: 'Frage' },
    { id: 'two', role: 'assistant', content: 'Antwort' },
    { id: 'typing', role: 'assistant', content: '…', isTyping: true },
    { id: 'failure', role: 'assistant', content: 'Fehler', failed: true },
    { id: 'now', role: 'user', content: 'Weiter' },
  ], 'now')).toEqual([{ role: 'user', content: 'Frage' }, { role: 'assistant', content: 'Antwort' }]);
});

/** Excludes UI placeholders, failed answers and the separately submitted turn. */
export function conversationHistory(messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; isTyping?: boolean; failed?: boolean }>, currentId?: string) {
  return messages.filter(m => m.id !== 'welcome' && !m.isTyping && !m.failed && m.id !== currentId).slice(-20).map(({ role, content }) => ({ role, content }));
}

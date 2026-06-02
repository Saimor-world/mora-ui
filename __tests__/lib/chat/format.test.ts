import { renderMarkdown, normalizeAgentResponse, extractPlanId } from '@/lib/chat/format';

describe('renderMarkdown', () => {
  it('renders inline emphasis and code', () => {
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
    expect(renderMarkdown('a *italic* b')).toContain('<em>italic</em>');
    expect(renderMarkdown('`code`')).toContain('<code');
  });
  it('renders headings and bullet lists', () => {
    expect(renderMarkdown('# Titel')).toContain('<h3');
    const list = renderMarkdown('- eins\n- zwei');
    expect(list).toContain('<ul');
    expect(list).toContain('<li');
  });
  it('wraps plain lines in paragraphs', () => {
    expect(renderMarkdown('hallo')).toContain('<p');
  });
});

describe('normalizeAgentResponse', () => {
  it('returns a plain string unchanged', () => {
    expect(normalizeAgentResponse('hallo welt')).toBe('hallo welt');
  });
  it('extracts the message field from a JSON object response', () => {
    expect(normalizeAgentResponse('{"message":"hi da"}')).toBe('hi da');
  });
  it('extracts from a fenced json block', () => {
    expect(normalizeAgentResponse('```json\n{"message":"aus block"}\n```')).toBe('aus block');
  });
  it('falls back to thought when no message', () => {
    expect(normalizeAgentResponse('{"thought":"denke"}')).toBe('denke');
  });
  it('decodes escaped unicode', () => {
    expect(normalizeAgentResponse('Gr\\u00fc\\u00dfe')).toBe('Grüße');
  });
  it('returns a friendly fallback for non-strings', () => {
    expect(normalizeAgentResponse(42)).toBe('Ich konnte die Antwort nicht verarbeiten.');
  });
});

describe('extractPlanId', () => {
  it('prefers the promoted top-level plan id', () => {
    expect(extractPlanId({ work_session_plan: { plan_id: 'p1' } } as any)).toBe('p1');
  });
  it('falls back to a plan-creating tool result', () => {
    expect(extractPlanId({ tools_executed: [{ tool: 'create_work_session_plan', result: { plan_id: 'p2' } }] } as any)).toBe('p2');
  });
  it('returns null when no plan exists', () => {
    expect(extractPlanId({ tools_executed: [] } as any)).toBeNull();
  });
});

import { isLikelyFileOperationIntent, shouldPreferAgenticLoop } from '@/lib/chat/intent';

describe('isLikelyFileOperationIntent', () => {
  it('detects file/folder operations', () => {
    expect(isLikelyFileOperationIntent('Erstelle einen Ordner Projekte')).toBe(true);
    expect(isLikelyFileOperationIntent('Verschiebe die Datei nach Archiv')).toBe(true);
    expect(isLikelyFileOperationIntent('Benenne das Dokument um')).toBe(true);
    expect(isLikelyFileOperationIntent('create a note')).toBe(true);
  });

  it('ignores plain conversation', () => {
    expect(isLikelyFileOperationIntent('Wie geht es dir?')).toBe(false);
    expect(isLikelyFileOperationIntent('Erzähl mir etwas über Saimor')).toBe(false);
  });
});

describe('shouldPreferAgenticLoop', () => {
  it('prefers the agentic loop for action verbs', () => {
    expect(shouldPreferAgenticLoop('Erstelle eine Notiz')).toBe(true);
    expect(shouldPreferAgenticLoop('lösche das alte Dokument')).toBe(true);
    expect(shouldPreferAgenticLoop('organisiere meine Dateien')).toBe(true);
    expect(shouldPreferAgenticLoop('kannst du das zusammenfassen?')).toBe(true);
  });

  it('only matches the adjacent phrase "fasse zusammen" (known heuristic gap)', () => {
    // The regex is /\bfasse zusammen\b/ — words must be adjacent.
    expect(shouldPreferAgenticLoop('fasse zusammen')).toBe(true);
    expect(shouldPreferAgenticLoop('fasse den Bericht zusammen')).toBe(false);
  });

  it('stays in plain chat for questions', () => {
    expect(shouldPreferAgenticLoop('Was ist das Wetter heute?')).toBe(false);
    expect(shouldPreferAgenticLoop('Wer bist du?')).toBe(false);
  });
});

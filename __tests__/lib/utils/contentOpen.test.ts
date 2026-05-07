import {
  getNodeSourceFileId,
  getNodeSourceFileName,
  getSourceFileDisplayName,
} from '@/lib/utils/contentOpen';

describe('contentOpen helpers', () => {
  it('accepts canonical and legacy source file metadata keys', () => {
    expect(getNodeSourceFileId({ metadata: { file_id: 'file-canonical' } })).toBe('file-canonical');
    expect(getNodeSourceFileId({ metadata: { source_file_id: 'file-legacy' } })).toBe('file-legacy');
    expect(getNodeSourceFileId({ metadata: { sourceFileId: 'file-camel' } })).toBe('file-camel');
  });

  it('keeps original source filenames across old and new metadata shapes', () => {
    expect(getNodeSourceFileName({
      id: 'node-1',
      name: 'Generated Document',
      metadata: { original_filename: 'vertrag.pdf' },
    })).toBe('vertrag.pdf');
    expect(getNodeSourceFileName({
      id: 'node-1',
      name: 'Generated Document',
      metadata: { source_filename: 'angebot.pdf' },
    })).toBe('angebot.pdf');
  });

  it('uses filename for raw source file records', () => {
    expect(getSourceFileDisplayName({ id: 'file-1', filename: 'rechnung.pdf' })).toBe('rechnung.pdf');
  });
});

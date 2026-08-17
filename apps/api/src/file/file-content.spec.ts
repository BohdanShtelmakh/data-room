import { previewContentType } from './file-content';

describe('previewContentType', () => {
  it('keeps safe browser-native content types', () => {
    expect(previewContentType('image/png')).toBe('image/png');
    expect(previewContentType('application/pdf')).toBe('application/pdf');
  });

  it('forces active document formats to plain text', () => {
    expect(previewContentType('text/html')).toBe('text/plain; charset=utf-8');
    expect(previewContentType('image/svg+xml')).toBe(
      'text/plain; charset=utf-8',
    );
  });

  it('rejects unsupported content types', () => {
    expect(previewContentType('application/zip')).toBeNull();
  });
});

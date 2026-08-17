const PLAIN_TEXT_MIME_TYPES = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'image/svg+xml',
]);

export function previewContentType(mimeType: string): string | null {
  const normalized = mimeType.toLowerCase().split(';', 1)[0].trim();

  if (
    normalized.startsWith('text/') ||
    PLAIN_TEXT_MIME_TYPES.has(normalized) ||
    normalized.endsWith('+json') ||
    normalized.endsWith('+xml')
  ) {
    return 'text/plain; charset=utf-8';
  }

  if (
    normalized.startsWith('image/') ||
    normalized.startsWith('audio/') ||
    normalized.startsWith('video/') ||
    normalized === 'application/pdf'
  ) {
    return normalized;
  }

  return null;
}

export function contentDisposition(
  type: 'attachment' | 'inline',
  filename: string,
) {
  const fallback = filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function fileMetadata(file: {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    folderId: file.folderId,
    ...(file.createdAt ? { createdAt: file.createdAt } : {}),
    ...(file.updatedAt ? { updatedAt: file.updatedAt } : {}),
  };
}

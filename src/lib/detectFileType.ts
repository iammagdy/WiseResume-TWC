/**
 * Shared file-type detection for the CV upload flow.
 *
 * Lives in one place so the import sheet (`ImportUploadSheet`) and the
 * upload page (`UploadPage`)'s drag-and-drop fallback can't drift out
 * of sync as new formats are added.
 */

export type FileType = 'pdf' | 'word' | 'image' | 'json' | 'html';

/**
 * One accept string covering every supported format. We list both
 * extensions and MIME types so iOS Safari, Android Chrome, and desktop
 * pickers all show the user's full library and accept any choice.
 */
export const ALL_ACCEPT_STRING =
  '.pdf,application/pdf,' +
  '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,' +
  '.json,application/json,' +
  '.html,.htm,text/html';

/**
 * Detect file type from MIME type or extension.
 *
 * Returns `null` when the file isn't one of the supported formats so
 * the caller can show a clear "unsupported type" message rather than
 * silently routing it into the PDF parser (which would fail with a
 * confusing error downstream).
 */
export function detectFileType(file: File): FileType | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime === 'application/json' || ext === 'json') return 'json';
  if (mime === 'text/html' || ext === 'html' || ext === 'htm') return 'html';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
    return 'image';
  }
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return 'word';
  }

  return null;
}

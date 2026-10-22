import { getCurrentLanguage, translate } from '../i18n/index.js';

const MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([...ALLOWED_IMAGE_EXTENSIONS, 'pdf', 'doc', 'docx', 'txt']);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_MIME_TYPES,
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// Validation reason -> message key in i18n/messages/portal.js (uploadValidation.*).
// Messages follow the current site language unless one is passed explicitly.
const CLIENT_SIDE_UPLOAD_ERROR_KEYS = {
  size: 'portal.uploadValidation.size',
  type: 'portal.uploadValidation.type',
  document_type: 'portal.uploadValidation.documentType',
  missing: 'portal.uploadValidation.missing'
};

function uploadMessage(reason, language) {
  const key = CLIENT_SIDE_UPLOAD_ERROR_KEYS[reason] ?? CLIENT_SIDE_UPLOAD_ERROR_KEYS.type;
  return translate(key, language);
}

function _extractExtension(filename) {
  if (!filename) {
    return null;
  }
  const baseName = filename.split('/').pop();
  if (!baseName || !baseName.includes('.')) {
    return null;
  }
  return baseName.split('.').pop().toLowerCase();
}

function _normalizeMimeType(mime) {
  if (!mime) {
    return '';
  }
  return mime.split(';')[0].trim().toLowerCase();
}

export function validateImageBeforeUpload(file) {
  if (!file) {
    return { isValid: false, reason: 'missing' };
  }
  const extension = _extractExtension(file.name);
  if (!extension || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return { isValid: false, reason: 'type' };
  }
  const mime = _normalizeMimeType(file.type);
  if (mime && !ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    return { isValid: false, reason: 'type' };
  }
  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    return { isValid: false, reason: 'size' };
  }
  return { isValid: true };
}

export function validateDocumentBeforeUpload(file) {
  if (!file) {
    return { isValid: false, reason: 'missing' };
  }
  const extension = _extractExtension(file.name);
  if (!extension || !ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    return { isValid: false, reason: 'document_type' };
  }
  const mime = _normalizeMimeType(file.type);
  if (mime && !ALLOWED_DOCUMENT_MIME_TYPES.has(mime) && !mime.startsWith('image/')) {
    return { isValid: false, reason: 'document_type' };
  }
  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    return { isValid: false, reason: 'size' };
  }
  return { isValid: true, isImage: ALLOWED_IMAGE_EXTENSIONS.has(extension) };
}

export function getClientSideUploadError(reason, language = getCurrentLanguage()) {
  if (!reason) {
    return null;
  }
  return uploadMessage(reason, language);
}

export function getUploadErrorMessage(error, language = getCurrentLanguage()) {
  if (!error) {
    return null;
  }
  if (error.status === 413) {
    return uploadMessage('size', language);
  }
  if (error.status === 415) {
    return uploadMessage('document_type', language);
  }
  if (error.status === 429) {
    return translate('portal.uploadValidation.tooMany', language);
  }
  // Anything below is server-provided text (English-only for now). Callers
  // that must stay monolingual can use isKnownUploadErrorStatus() first.
  if (error.body?.error) {
    return error.body.error;
  }
  if (Array.isArray(error.body?.errors) && error.body.errors.length) {
    return error.body.errors[0]?.message || null;
  }
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return null;
}

// True when getUploadErrorMessage() answers with a translated message rather
// than server-provided text.
export function isKnownUploadErrorStatus(error) {
  return [413, 415, 429].includes(error?.status);
}

export { MAX_IMAGE_UPLOAD_SIZE };

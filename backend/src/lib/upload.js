import multer from 'multer';

export function memoryUpload(options = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxSize ?? 10 * 1024 * 1024 },
    fileFilter: options.fileFilter,
  });
}

/** Parse multipart/form-data fields with no file uploads (Netlify-safe for POST bodies) */
export const formParser = multer().none();

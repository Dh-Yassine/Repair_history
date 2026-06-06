import multer from 'multer';

export function memoryUpload(options = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxSize ?? 10 * 1024 * 1024 },
    fileFilter: options.fileFilter,
  });
}

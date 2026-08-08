import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { backendRoot } from './paths.js';

const rootDir = backendRoot(import.meta.url);

export const BUCKETS = {
  vehicles: process.env.SUPABASE_BUCKET_VEHICLES || 'vehicle-photos',
  documents: process.env.SUPABASE_BUCKET_DOCUMENTS || 'documents',
  proofs: process.env.SUPABASE_BUCKET_PROOFS || 'shop-proofs',
};

const BUCKET_CONFIG = {
  [BUCKETS.vehicles]: {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  },
  [BUCKETS.documents]: {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  },
  [BUCKETS.proofs]: {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  },
};

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function localRoot() {
  return process.env.UPLOAD_DIR || path.join(rootDir, 'uploads');
}

function localPath(bucket, key) {
  const sub = bucket === BUCKETS.vehicles ? 'vehicles' : bucket === BUCKETS.proofs ? 'proofs' : '';
  return sub ? path.join(localRoot(), sub, key) : path.join(localRoot(), key);
}

/** Encode each path segment for URLs (keeps slashes between segments). */
export function encodeStorageKey(key) {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

/** Normalize browser/OS mime quirks for Supabase bucket allow-lists */
export function normalizeContentType(contentType) {
  if (!contentType) return 'application/octet-stream';
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (ct === 'image/jpg') return 'image/jpeg';
  if (ct === 'image/pjpeg') return 'image/jpeg';
  return ct;
}

/** Infer image MIME from extension when browsers send application/octet-stream */
export function inferImageContentType(key, contentType) {
  const normalized = normalizeContentType(contentType);
  if (normalized.startsWith('image/')) return normalized;
  const ext = path.extname(key).toLowerCase();
  return EXT_TO_MIME[ext] || normalized;
}

async function ensureBucket(supabase, bucket) {
  const config = BUCKET_CONFIG[bucket];
  if (!config) return;

  const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);

  if (getError && !/not found|does not exist/i.test(getError.message)) {
    throw new Error(`Storage bucket "${bucket}" check failed: ${getError.message}`);
  }

  if (!existing) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes,
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Storage bucket "${bucket}" missing: ${error.message}`);
    }
    return;
  }

  if (config.public && !existing.public) {
    const { error } = await supabase.storage.updateBucket(bucket, { public: true });
    if (error) {
      console.warn(`Could not make bucket "${bucket}" public: ${error.message}`);
    }
  }
}

/** @returns {Promise<string>} storage key stored in DB */
export async function saveUpload(bucket, key, buffer, contentType) {
  const bin = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (!bin.length) throw new Error('Upload file is empty');

  const resolvedType =
    bucket === BUCKETS.vehicles
      ? inferImageContentType(key, contentType)
      : normalizeContentType(contentType);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await ensureBucket(supabase, bucket);

    const { error } = await supabase.storage.from(bucket).upload(key, bin, {
      contentType: resolvedType,
      upsert: true,
      cacheControl: '3600',
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return key;
  }

  const dest = localPath(bucket, key);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bin);
  return key;
}

export async function readUploadBuffer(bucket, key) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(bucket).download(key);
    if (error) throw new Error(error.message);
    return Buffer.from(await data.arrayBuffer());
  }

  const filePath = localPath(bucket, key);
  if (!fs.existsSync(filePath)) throw new Error('File not found');
  return fs.readFileSync(filePath);
}

export async function deleteUpload(bucket, key) {
  if (!key) return;
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(bucket).remove([key]).catch(() => {});
    return;
  }
  const filePath = localPath(bucket, key);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/** Public URL for public buckets, signed URL for private ones */
export async function resolveFileUrl(bucket, key, { publicBucket = false } = {}) {
  if (!key) return null;
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const bucketPublic = publicBucket || BUCKET_CONFIG[bucket]?.public;
    if (bucketPublic) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  const sub =
    bucket === BUCKETS.vehicles ? 'vehicles' : bucket === BUCKETS.proofs ? 'proofs' : '';
  const encoded = encodeStorageKey(key);
  return sub ? `/uploads/${sub}/${encoded}` : `/uploads/${encoded}`;
}

/** Resolve a display URL for a vehicle photo (public bucket first, then signed/local). */
export async function resolveVehiclePhotoUrl(photoPath) {
  if (!photoPath) return null;
  try {
    return await resolveFileUrl(BUCKETS.vehicles, photoPath, { publicBucket: true });
  } catch (err) {
    console.error('resolveVehiclePhotoUrl (public) failed:', err.message);
    try {
      return await resolveFileUrl(BUCKETS.vehicles, photoPath, { publicBucket: false });
    } catch (inner) {
      console.error('resolveVehiclePhotoUrl (signed) failed:', inner.message);
      return null;
    }
  }
}

export function vehiclePhotoKey(originalName) {
  const ext = path.extname(originalName || '').toLowerCase() || '.jpg';
  return `photos/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

export function documentKey(originalName) {
  const ext = path.extname(originalName || '') || '.bin';
  return `docs/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

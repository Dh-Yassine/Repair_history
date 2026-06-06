import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BUCKETS = {
  vehicles: process.env.SUPABASE_BUCKET_VEHICLES || 'vehicle-photos',
  documents: process.env.SUPABASE_BUCKET_DOCUMENTS || 'documents',
  proofs: process.env.SUPABASE_BUCKET_PROOFS || 'shop-proofs',
};

function localRoot() {
  return process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
}

function localPath(bucket, key) {
  const sub = bucket === BUCKETS.vehicles ? 'vehicles' : bucket === BUCKETS.proofs ? 'proofs' : '';
  return sub ? path.join(localRoot(), sub, key) : path.join(localRoot(), key);
}

/** @returns {Promise<string>} storage key stored in DB */
export async function saveUpload(bucket, key, buffer, contentType) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).upload(key, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return key;
  }

  const dest = localPath(bucket, key);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
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
    if (publicBucket) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  const sub =
    bucket === BUCKETS.vehicles ? 'vehicles' : bucket === BUCKETS.proofs ? 'proofs' : '';
  return sub ? `/uploads/${sub}/${encodeURIComponent(key)}` : `/uploads/${encodeURIComponent(key)}`;
}

export function vehiclePhotoKey(originalName) {
  const ext = path.extname(originalName || '') || '.jpg';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

export function documentKey(originalName) {
  const ext = path.extname(originalName || '') || '.bin';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

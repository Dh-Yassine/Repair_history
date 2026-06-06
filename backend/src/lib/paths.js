import path from 'path';
import { fileURLToPath } from 'url';

/** Works in local Node, Vercel, and Netlify (where esbuild may strip import.meta.url). */
export function backendSrcDir(fromMetaUrl) {
  try {
    if (fromMetaUrl) {
      return path.dirname(fileURLToPath(fromMetaUrl));
    }
  } catch {
    /* fall through */
  }
  return path.join(process.cwd(), 'backend', 'src');
}

export function backendRoot(fromMetaUrl) {
  return path.join(backendSrcDir(fromMetaUrl), '..');
}

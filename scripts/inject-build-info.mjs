import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const indexPath = resolve('dist/grounded-fruitful/browser/index.html');
const sha = (process.env.COMMIT_REF || process.env.GIT_COMMIT || '').trim();
const productionBuild = process.argv.includes('--require-sha') || process.env.NETLIFY === 'true';

if (productionBuild && !/^[a-f\d]{7,64}$/i.test(sha)) {
  throw new Error('A valid Netlify COMMIT_REF is required for production build metadata.');
}

if (sha) {
  if (!/^[a-f\d]{7,64}$/i.test(sha)) throw new Error('Build commit SHA has an invalid format.');
  const html = await readFile(indexPath, 'utf8');
  const updated = html.replace(/(<meta\s+name=["']build-sha["']\s+content=["'])[^"']*(["']\s*\/?>)/i, `$1${sha}$2`);
  if (updated === html) throw new Error('The build-sha metadata placeholder was not found.');
  await writeFile(indexPath, updated);
  console.log(`Injected build SHA ${sha.slice(0, 12)}.`);
} else {
  console.warn('COMMIT_REF is unavailable; leaving local build SHA as unknown.');
}

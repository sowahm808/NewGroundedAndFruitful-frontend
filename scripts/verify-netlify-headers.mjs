import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const config = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const policies = [...config.matchAll(/^\s*Cross-Origin-Opener-Policy\s*=\s*["']([^"']+)["']/gim)].map(
  ([, value]) => value,
);
assert.deepEqual(policies, ['same-origin-allow-popups'], 'COOP must have one authoritative compatible value');
assert(!config.includes('Cross-Origin-Embedder-Policy'), 'COEP must not be enabled without an isolation requirement');
console.log('Netlify document COOP configuration is authoritative and popup-compatible.');

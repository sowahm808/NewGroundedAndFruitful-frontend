import { readFile } from 'node:fs/promises';

const source = process.env['BACKEND_OPENAPI'];
if (!source) {
  throw new Error('Set BACKEND_OPENAPI to the backend-owned OpenAPI JSON file or HTTPS URL.');
}

const document = source.startsWith('https://')
  ? await fetch(source).then((response) => {
      if (!response.ok) throw new Error(`OpenAPI download failed with HTTP ${response.status}.`);
      return response.json();
    })
  : JSON.parse(await readFile(source, 'utf8'));

const operations = [
  ['post', '/auth/child-token'],
  ['get', '/auth/session'],
  ['post', '/onboarding/organization'],
  ['get', '/admin/organizations'],
  ['get', '/admin/memberships'],
  ['patch', '/admin/memberships/{membershipId}'],
  ['get', '/admin/quarters'],
  ['post', '/admin/quarters'],
  ['get', '/child/today'],
  ['get', '/child/check-ins/today'],
  ['put', '/child/check-ins/today/draft'],
  ['post', '/child/check-ins/today/complete'],
  ['get', '/child/gratitude'],
  ['post', '/child/gratitude'],
  ['get', '/child/character'],
  ['put', '/child/character/draft'],
  ['post', '/child/character/complete'],
  ['get', '/child/bible'],
  ['get', '/child/reading'],
  ['get', '/child/projects'],
  ['post', '/child/projects'],
  ['get', '/child/team'],
  ['get', '/child/special-activities'],
  ['get', '/child/surveys'],
  ['get', '/child/points'],
  ['get', '/child/awards'],
  ['get', '/parent/dashboard'],
  ['get', '/parent/children'],
  ['get', '/parent/character'],
  ['patch', '/parent/character'],
  ['get', '/parent/observations'],
  ['post', '/parent/observations'],
  ['get', '/parent/family/activities'],
  ['get', '/parent/academic-support/configuration'],
  ['get', '/parent/academic-support/requests'],
  ['post', '/parent/academic-support/requests'],
  ['get', '/parent/reports'],
];

const missing = operations.filter(([method, path]) => !document.paths?.[path]?.[method]);
if (missing.length) {
  throw new Error(
    `Frontend operations missing from backend OpenAPI:\n${missing.map(([m, p]) => `${m.toUpperCase()} ${p}`).join('\n')}`,
  );
}

for (const [method, path] of operations) {
  const operation = document.paths[path][method];
  if (!operation.responses?.['200'] && !operation.responses?.['201'] && !operation.responses?.['204']) {
    throw new Error(`${method.toUpperCase()} ${path} has no documented success response.`);
  }
  for (const status of ['401', '403', '404', '409', '422', '429', '500']) {
    if (!operation.responses?.[status] && !operation.responses?.default) {
      throw new Error(`${method.toUpperCase()} ${path} does not document ${status} (or a default response).`);
    }
  }
}

console.log(`Verified ${operations.length} frontend operations against ${source}.`);

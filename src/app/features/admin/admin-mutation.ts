import { HttpHeaders } from '@angular/common/http';

/**
 * Every administration write is a retryable command. The key lets the API
 * deduplicate a logical request while If-Match prevents stale editors from
 * overwriting a newer representation.
 */
export function adminMutationOptions(version?: number, idempotencyKey = crypto.randomUUID()): {
  headers: HttpHeaders;
} {
  let headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
  if (version !== undefined) headers = headers.set('If-Match', `"${version}"`);
  return { headers };
}

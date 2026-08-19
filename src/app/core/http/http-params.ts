import { HttpParams } from '@angular/common/http';

export type QueryParameterValue = string | number | boolean | null | undefined;

/** Builds query parameters without sending absent optional values to the API. */
export function buildHttpParams(values: Readonly<Record<string, QueryParameterValue>>): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) continue;
    params = params.set(key, String(value));
  }

  return params;
}

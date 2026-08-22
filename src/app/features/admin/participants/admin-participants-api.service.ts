import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { ApiError } from '../../../core/http/api-error';

export type ParticipantStatus = 'pending' | 'active' | 'withdrawn';
export type ParticipantSort = 'updatedAt_desc' | 'name_asc';

export interface ParticipantListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: ParticipantStatus;
  readonly teamId?: string;
  readonly sort?: ParticipantSort;
}

export interface ParticipantSummary {
  readonly id: string;
  readonly name: string;
  readonly enrollmentStatus: ParticipantStatus;
  readonly linkedGuardian?: string;
  readonly team?: string;
  readonly currentQuarterStatus?: string;
  readonly updatedAt: string;
  readonly allowedActions?: readonly string[];
}

export interface ParticipantPage {
  readonly items: readonly ParticipantSummary[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminParticipantsApiService {
  private readonly api = inject(ApiClient);

  list(query: ParticipantListQuery): Observable<ParticipantPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.api.getData<unknown>('/admin/participants', { params }).pipe(map(parseParticipantPage));
  }
}

function parseParticipantPage(value: unknown): ParticipantPage {
  if (!isRecord(value) || !Array.isArray(value['items']) || !isPagination(value['pagination'])) contractError();
  const items = value['items'].map((item) => {
    if (
      !isRecord(item) ||
      typeof item['id'] !== 'string' ||
      typeof item['name'] !== 'string' ||
      !isStatus(item['enrollmentStatus']) ||
      typeof item['updatedAt'] !== 'string'
    )
      contractError();
    return item as unknown as ParticipantSummary;
  });
  return { items, pagination: value['pagination'] };
}

function isPagination(value: unknown): value is ParticipantPage['pagination'] {
  return (
    isRecord(value) &&
    ['page', 'pageSize', 'total', 'totalPages'].every(
      (key) => Number.isInteger(value[key]) && (value[key] as number) >= 0,
    )
  );
}
function isStatus(value: unknown): value is ParticipantStatus {
  return value === 'pending' || value === 'active' || value === 'withdrawn';
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function contractError(): never {
  throw new ApiError(-1, 'unexpected_error', 'The participant response did not match the published API contract.');
}

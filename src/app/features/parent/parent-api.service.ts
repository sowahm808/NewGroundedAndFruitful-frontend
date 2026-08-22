import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';
import { ApiError } from '../../core/http/api-error';
import { buildHttpParams } from '../../core/http/http-params';

export type RecordStatus = 'active' | 'pending' | 'inactive' | 'completed' | 'closed' | 'submitted';
export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}
export interface ParentChild {
  readonly id: string;
  readonly displayName: string;
  readonly status: string;
  readonly team?: { readonly id: string; readonly name: string };
  readonly quarter?: { readonly id: string; readonly name: string };
  readonly weeklyParticipation?: { readonly completed: number; readonly available: number };
  readonly teamProgress?: { readonly completed: number; readonly target: number };
  readonly readingProgress?: string;
  readonly projectStatus?: string;
}
export interface ParentDashboard {
  readonly children: readonly ParentChild[];
  readonly calculatedAt?: string;
}
export interface CharacterCycle {
  readonly childId: string;
  readonly quarter?: string;
  readonly qualities: readonly {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly selected: boolean;
  }[];
  readonly editable: boolean;
}
export interface Observation {
  readonly id: string;
  readonly childId: string;
  readonly summary: string;
  readonly status: string;
  readonly submittedAt: string;
}
export interface FamilyActivity {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: string;
}
export interface SupportRequest {
  readonly id: string;
  readonly category: string;
  readonly summary: string;
  readonly status: string;
  readonly createdAt: string;
}
export interface SupportConfiguration {
  readonly categories: readonly { readonly id: string; readonly label: string }[];
}
export interface ParentReport {
  readonly id: string;
  readonly childId: string;
  readonly title: string;
  readonly status: string;
  readonly availableAt?: string;
  readonly calculatedAt?: string;
}
export interface ParticipationSummary {
  readonly childId: string;
  readonly period: string;
  readonly completed: number;
  readonly available: number;
  readonly calculatedAt: string;
}
export interface ParentNotification {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly status: string;
  readonly createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ParentApi {
  private readonly api = inject(ApiClient);
  dashboard(): Observable<ParentDashboard> {
    return this.api.getData('/parent/dashboard');
  }
  children(search = '', status = '', cursor = ''): Observable<CursorPage<ParentChild>> {
    return this.api
      .getData<unknown>('/parent/children', { params: buildHttpParams({ search, status, cursor }) })
      .pipe(map(normalizeChildrenPage));
  }
  child(id: string): Observable<ParentChild> {
    return this.api.getData(`/parent/children/${encodeURIComponent(id)}`);
  }
  character(childId = ''): Observable<CharacterCycle> {
    return this.api.getData('/parent/character', { params: buildHttpParams({ childId }) });
  }
  saveCharacter(childId: string, qualityIds: readonly string[]): Observable<CharacterCycle> {
    return this.api.patchData('/parent/character', { childId, qualityIds });
  }
  observations(childId = '', cursor = ''): Observable<CursorPage<Observation>> {
    return this.api.getData('/parent/observations', { params: buildHttpParams({ childId, cursor }) });
  }
  submitObservation(body: { childId: string; summary: string }): Observable<Observation> {
    return this.api.postData('/parent/observations', body);
  }
  family(childId = ''): Observable<CursorPage<FamilyActivity>> {
    return this.api.getData('/parent/family/activities', { params: buildHttpParams({ childId }) });
  }
  completeActivity(id: string, childId: string): Observable<FamilyActivity> {
    return this.api.postData(`/parent/family/activities/${encodeURIComponent(id)}/completions`, { childId });
  }
  supportConfiguration(): Observable<SupportConfiguration> {
    return this.api.getData('/parent/academic-support/configuration');
  }
  supportRequests(cursor = ''): Observable<CursorPage<SupportRequest>> {
    return this.api.getData('/parent/academic-support/requests', { params: buildHttpParams({ cursor }) });
  }
  createSupport(body: { childId: string; categoryId: string; summary: string }): Observable<SupportRequest> {
    return this.api.postData('/parent/academic-support/requests', body);
  }
  reports(childId = '', cursor = ''): Observable<CursorPage<ParentReport>> {
    return this.api.getData('/parent/reports', { params: buildHttpParams({ childId, cursor }) });
  }
  participation(childId: string, cursor = ''): Observable<CursorPage<ParticipationSummary>> {
    return this.api.getData('/parent/participation', { params: buildHttpParams({ childId, cursor }) });
  }
  notifications(search = '', status = '', cursor = ''): Observable<CursorPage<ParentNotification>> {
    return this.api.getData('/parent/notifications', { params: buildHttpParams({ search, status, cursor }) });
  }
}

/** Validates the published `{ data: { items, hasMore, nextCursor? } }` contract once. */
function normalizeChildrenPage(value: unknown): CursorPage<ParentChild> {
  if (!isRecord(value) || !Array.isArray(value['items']) || typeof value['hasMore'] !== 'boolean')
    throw new ApiError(-1, 'unexpected_error', 'The linked-child response did not match the published contract.');
  const items = value['items'];
  if (!items.every(isParentChild))
    throw new ApiError(-1, 'unexpected_error', 'The linked-child response contained an invalid relationship.');
  const nextCursor = value['nextCursor'];
  if (nextCursor !== undefined && typeof nextCursor !== 'string')
    throw new ApiError(-1, 'unexpected_error', 'The linked-child cursor was invalid.');
  return { items, hasMore: value['hasMore'], ...(nextCursor ? { nextCursor } : {}) };
}

function isParentChild(value: unknown): value is ParentChild {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].length > 0 &&
    typeof value['displayName'] === 'string' &&
    typeof value['status'] === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  readonly approvedDisplayName: string;
  readonly handle?: string;
  readonly status: string;
  readonly team: { readonly id: string; readonly displayName: string } | null;
  readonly quarter: { readonly id: string; readonly displayName: string } | null;
  readonly weeklyParticipation: { readonly completed: number; readonly available: number };
  readonly teamProgress: { readonly completed: number; readonly target: number } | null;
  readonly readingProgress: { readonly completed: number; readonly assigned: number };
  readonly projectStatus: string | null;
  readonly calculatedAt: string;
  readonly sourceQuarterId: string | null;
  readonly sourceWeekId: string | null;
}
export interface ParentDashboard {
  readonly children: readonly ParentChild[];
  readonly calculatedAt?: string;
}
export interface CharacterQuality {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}
export interface CharacterSelection {
  readonly childId: string;
  readonly quarterId: string;
  readonly quarterName?: string;
  readonly currentWeekNumber?: number;
  readonly qualityIds: readonly string[];
  readonly version: number;
  readonly updatedAt: string | null;
  readonly editable?: boolean;
  readonly selectionLimit?: number;
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
      .getCollectionData<unknown>('/parent/children', { params: buildHttpParams({ search, status, cursor }) })
      .pipe(map(normalizeChildrenPage));
  }
  child(id: string): Observable<ParentChild> {
    return this.api.getData<unknown>(`/parent/children/${encodeURIComponent(id)}`).pipe(map(normalizeParentChild));
  }
  characterQualities(): Observable<readonly CharacterQuality[]> {
    return this.api
      .getData<unknown>('/parent/character/qualities')
      .pipe(map((value) => normalizeArray<CharacterQuality>(value)));
  }
  characterSelection(childId: string): Observable<CharacterSelection> {
    return this.api.getData('/parent/character/selection', { params: buildHttpParams({ childId }) });
  }
  saveCharacterSelection(body: {
    childId: string;
    quarterId: string;
    qualityIds: readonly string[];
    expectedVersion: number;
  }): Observable<CharacterSelection> {
    return this.api.postData('/parent/character/selection', body);
  }
  setChildCredentials(
    childId: string,
    body: { handle?: string; pin: string },
  ): Observable<{ success: true; handle: string }> {
    return this.api.postData(`/parent/children/${encodeURIComponent(childId)}/credentials`, body);
  }
  observations(childId = '', cursor = ''): Observable<CursorPage<Observation>> {
    return this.api
      .getData<unknown>('/parent/observations', { params: buildHttpParams({ childId, cursor }) })
      .pipe(map((value) => normalizeOptionalPage<Observation>(value)));
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
    return this.api.getData<unknown>('/parent/academic-support/configuration').pipe(map(normalizeSupportConfiguration));
  }
  supportRequests(cursor = ''): Observable<CursorPage<SupportRequest>> {
    return this.api
      .getData<unknown>('/parent/academic-support/requests', { params: buildHttpParams({ cursor }) })
      .pipe(map((value) => normalizeOptionalPage<SupportRequest>(value)));
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

/** Tolerates the collection shapes used by deployed and legacy parent endpoints. */
function normalizeOptionalPage<T>(value: unknown): CursorPage<T> {
  const items = normalizeArray<T>(value);
  const record = isRecord(value) ? value : undefined;
  const nextCursor =
    typeof record?.['nextCursor'] === 'string' && record['nextCursor'] ? record['nextCursor'] : undefined;
  const hasMore = typeof record?.['hasMore'] === 'boolean' ? record['hasMore'] : Boolean(nextCursor);
  return { items, hasMore, ...(nextCursor ? { nextCursor } : {}) };
}

function normalizeArray<T>(value: unknown): readonly T[] {
  if (Array.isArray(value)) return value as readonly T[];
  if (!isRecord(value)) return [];
  if (Array.isArray(value['items'])) return value['items'] as readonly T[];
  return normalizeArray<T>(value['data']);
}

function normalizeSupportConfiguration(value: unknown): SupportConfiguration {
  if (Array.isArray(value)) return { categories: value as SupportConfiguration['categories'] };
  if (!isRecord(value)) return { categories: [] };
  return {
    categories: normalizeArray<SupportConfiguration['categories'][number]>(value['categories'] ?? value['data']),
  };
}

/** Validates the published `{ data: { items, hasMore, nextCursor? } }` contract once. */
function normalizeChildrenPage(value: CursorPage<unknown>): CursorPage<ParentChild> {
  if (!Array.isArray(value.items) || typeof value.hasMore !== 'boolean')
    throw new ApiError(-1, 'unexpected_error', 'The linked-child response did not match the published contract.');
  const items = value.items.map(normalizeParentChild);
  const nextCursor = value.nextCursor;
  if (nextCursor !== undefined && typeof nextCursor !== 'string')
    throw new ApiError(-1, 'unexpected_error', 'The linked-child cursor was invalid.');
  return { items, hasMore: value['hasMore'], ...(nextCursor ? { nextCursor } : {}) };
}

function normalizeParentChild(value: unknown): ParentChild {
  if (!isRecord(value) || !isNonEmptyString(value['id']) || !isNonEmptyString(value['status']))
    throw new ApiError(-1, 'unexpected_error', 'The linked-child response contained an invalid relationship.');

  const id = value['id'];
  const approvedDisplayName =
    firstNonEmptyString(value['approvedDisplayName'], value['displayName'], value['name']) ??
    `Participant (${id.slice(0, 6)})`;
  const team = normalizeTeam(value['team'], value);
  const quarter = normalizeNamedReference(value['quarter']);
  const weeklyParticipation = normalizeProgress(value['weeklyParticipation'], 'available');
  const teamProgress = normalizeProgress(value['teamProgress'], 'target');
  const readingProgress = normalizeProgress(value['readingProgress'], 'assigned');

  return {
    ...(value as Partial<ParentChild>),
    id,
    status: value['status'],
    approvedDisplayName,
    team: team ?? null,
    quarter: quarter ?? null,
    weeklyParticipation: weeklyParticipation ?? { completed: 0, available: 0 },
    teamProgress: teamProgress ?? null,
    readingProgress: readingProgress ?? { completed: 0, assigned: 0 },
    projectStatus: isNonEmptyString(value['projectStatus']) ? value['projectStatus'].trim() : null,
    calculatedAt: firstNonEmptyString(value['calculatedAt']) ?? '',
    sourceQuarterId: firstNonEmptyString(value['sourceQuarterId']) ?? null,
    sourceWeekId: firstNonEmptyString(value['sourceWeekId']) ?? null,
  } as ParentChild;
}

function normalizeTeam(value: unknown, child: Record<string, unknown>): NonNullable<ParentChild['team']> | undefined {
  if (!isRecord(value)) {
    const id = firstNonEmptyString(child['teamId'], child['activeTeamId']);
    if (!id) return undefined;
    return { id, displayName: firstNonEmptyString(child['teamName']) ?? 'Growth Team' };
  }
  const id = firstNonEmptyString(value['id'], value['teamId']);
  if (!id) return undefined;
  return {
    id,
    displayName:
      firstNonEmptyString(value['approvedDisplayName'], value['displayName'], value['name']) ?? 'Growth Team',
  };
}

function normalizeNamedReference(value: unknown): NonNullable<ParentChild['quarter']> | undefined {
  if (!isRecord(value)) return undefined;
  const id = firstNonEmptyString(value['id']);
  const name = firstNonEmptyString(value['approvedDisplayName'], value['displayName'], value['name']);
  return id && name ? { id, displayName: name } : undefined;
}

function normalizeProgress(
  value: unknown,
  totalKey: 'available' | 'target' | 'assigned',
):
  | { readonly completed: number; readonly available: number }
  | { readonly completed: number; readonly target: number }
  | { readonly completed: number; readonly assigned: number }
  | undefined {
  if (!isRecord(value) || !isNonNegativeNumber(value['completed']) || !isNonNegativeNumber(value[totalKey]))
    return undefined;
  return { completed: value['completed'], [totalKey]: value[totalKey] } as
    | { readonly completed: number; readonly available: number }
    | { readonly completed: number; readonly target: number }
    | { readonly completed: number; readonly assigned: number };
}

function firstNonEmptyString(...values: readonly unknown[]): string | undefined {
  return values.find(isNonEmptyString)?.trim();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

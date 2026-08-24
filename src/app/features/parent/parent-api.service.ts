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
  readonly displayName: string;
  readonly status: string;
  readonly team?: { readonly id: string; readonly name: string };
  readonly quarter?: { readonly id: string; readonly name: string };
  readonly weeklyParticipation?: { readonly completed: number; readonly available: number };
  readonly teamProgress?: { readonly completed: number; readonly target: number };
  readonly readingProgress?: string;
  readonly projectStatus?: string;
  readonly handle?: string;
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
    return this.api.getData('/parent/character/qualities');
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
  const readingProgress = normalizeReadingProgress(value['readingProgress']);

  return {
    ...(value as Partial<ParentChild>),
    id,
    status: value['status'],
    approvedDisplayName,
    displayName: approvedDisplayName,
    ...(team ? { team } : {}),
    ...(quarter ? { quarter } : {}),
    ...(weeklyParticipation ? { weeklyParticipation } : {}),
    ...(teamProgress ? { teamProgress } : {}),
    ...(readingProgress ? { readingProgress } : {}),
  } as ParentChild;
}

function normalizeTeam(value: unknown, child: Record<string, unknown>): ParentChild['team'] | undefined {
  if (!isRecord(value)) {
    const id = firstNonEmptyString(child['teamId'], child['activeTeamId']);
    if (!id) return undefined;
    return { id, name: firstNonEmptyString(child['teamName']) ?? 'Growth Team' };
  }
  const id = firstNonEmptyString(value['id'], value['teamId']);
  if (!id) return undefined;
  return {
    id,
    name: firstNonEmptyString(value['approvedDisplayName'], value['displayName'], value['name']) ?? 'Growth Team',
  };
}

function normalizeNamedReference(value: unknown): ParentChild['quarter'] | undefined {
  if (!isRecord(value)) return undefined;
  const id = firstNonEmptyString(value['id']);
  const name = firstNonEmptyString(value['approvedDisplayName'], value['displayName'], value['name']);
  return id && name ? { id, name } : undefined;
}

function normalizeReadingProgress(value: unknown): string | undefined {
  if (isNonEmptyString(value)) return value.trim();
  if (!isRecord(value)) return undefined;
  const label = firstNonEmptyString(value['label'], value['summary'], value['status']);
  if (label) return label;
  const completed = value['completed'];
  const target = value['target'] ?? value['available'];
  return isNonNegativeNumber(completed) && isNonNegativeNumber(target) ? `${completed} of ${target}` : undefined;
}

function normalizeProgress(
  value: unknown,
  totalKey: 'available' | 'target',
):
  | { readonly completed: number; readonly available: number }
  | { readonly completed: number; readonly target: number }
  | undefined {
  if (!isRecord(value) || !isNonNegativeNumber(value['completed']) || !isNonNegativeNumber(value[totalKey]))
    return undefined;
  return { completed: value['completed'], [totalKey]: value[totalKey] } as
    | { readonly completed: number; readonly available: number }
    | { readonly completed: number; readonly target: number };
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

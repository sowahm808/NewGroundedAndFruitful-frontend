import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error';
import { ApiClient } from '../../../core/http/api-client.service';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import { adminMutationOptions } from '../admin-mutation';

export const QUARTER_STATUSES = [
  'draft',
  'scheduled',
  'open',
  'checkpoint',
  'closed',
  'recognition',
  'archived',
] as const;
export type QuarterStatus = (typeof QUARTER_STATUSES)[number];
export const QUARTER_STATUS_LABELS: Record<QuarterStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  open: 'Open',
  checkpoint: 'Checkpoint',
  closed: 'Closed',
  recognition: 'Recognition',
  archived: 'Archived',
};
export type QuarterAction = 'edit' | 'activate' | 'close' | 'archive';
export type QuarterSort = '-updatedAt' | 'name' | 'startDate';
export const DEFAULT_QUARTER_SORT: QuarterSort = '-updatedAt';
export type DateOnlyValue = string & { readonly __dateOnly: unique symbol };

/** The list shape published by the backend. Authority and workspace names are intentionally not part of it. */
export interface QuarterListItemDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: QuarterStatus;
  readonly organizationId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}
export interface Quarter {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly startDate: DateOnlyValue;
  readonly endDate: DateOnlyValue;
  readonly status: QuarterStatus | 'unknown';
  readonly statusLabel: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly updatedAt: Date;
  readonly updatedAtIso: string;
  readonly version: number;
  readonly allowedActions: readonly QuarterAction[];
}
export interface QuarterPagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}
export interface QuarterList {
  readonly items: readonly Quarter[];
  readonly pagination: QuarterPagination;
}
interface QuarterListDto {
  readonly items: readonly unknown[];
  readonly pagination: QuarterPagination;
}
export interface QuarterQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: QuarterStatus;
  readonly search?: string;
  readonly sort: QuarterSort;
}
export interface CreateQuarterRequest {
  readonly organizationId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}
export interface UpdateQuarterRequest extends Omit<CreateQuarterRequest, 'organizationId'> {
  readonly expectedVersion: number;
}

/** Validates the wire contract and creates the only table view-model projection. */
export function toQuarterRow(
  value: unknown,
  activeWorkspace: { readonly id: string; readonly name: string } | null,
  capabilities: readonly string[],
): Quarter {
  if (!isRecord(value)) throw contractError('item must be an object');
  for (const field of ['id', 'name', 'startDate', 'endDate', 'organizationId', 'createdAt', 'updatedAt'] as const) {
    if (typeof value[field] !== 'string' || value[field].length === 0) throw contractError(`${field} must be a string`);
  }
  if (value['description'] !== null && typeof value['description'] !== 'string')
    throw contractError('description must be a string or null');
  if (!Number.isInteger(value['version']) || (value['version'] as number) < 1)
    throw contractError('version must be a positive integer');
  const item = value as unknown as QuarterListItemDto;
  const startDate = parseDateOnly(item.startDate, 'startDate');
  const endDate = parseDateOnly(item.endDate, 'endDate');
  if (endDate < startDate) throw contractError('endDate must not be before startDate');
  const updatedAt = new Date(item.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) throw contractError('updatedAt must be an ISO instant');
  const knownStatus = typeof item.status === 'string' && (QUARTER_STATUSES as readonly string[]).includes(item.status);
  if (!knownStatus) console.warn('Quarter contract diagnostic: unknown status received.');
  const status = knownStatus ? item.status : 'unknown';
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    startDate,
    endDate,
    status,
    statusLabel: knownStatus ? QUARTER_STATUS_LABELS[item.status] : 'Unknown status',
    workspaceId: item.organizationId,
    workspaceName:
      activeWorkspace && activeWorkspace.id === item.organizationId ? activeWorkspace.name : 'Workspace unavailable',
    updatedAt,
    updatedAtIso: item.updatedAt,
    version: item.version,
    allowedActions: knownStatus ? actionsFor(status as QuarterStatus, capabilities) : [],
  };
}

function actionsFor(status: QuarterStatus, capabilities: readonly string[]): readonly QuarterAction[] {
  const granted = new Set(capabilities);
  const has = (specific: string) => granted.has(specific) || granted.has('admin.quarters.manage');
  const actions: QuarterAction[] = [];
  if (has('admin.quarters.update')) actions.push('edit');
  if (has('admin.quarters.transition')) {
    if (status === 'draft') actions.push('activate');
    if (status === 'open' || status === 'checkpoint') actions.push('close');
    if (status === 'closed' || status === 'recognition') actions.push('archive');
  }
  return actions;
}

function parseDateOnly(value: string, field: string): DateOnlyValue {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw contractError(`${field} must use YYYY-MM-DD`);
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.toISOString().slice(0, 10) !== value) throw contractError(`${field} must be a valid calendar date`);
  return value as DateOnlyValue;
}

function contractError(reason: string): ApiError {
  return new ApiError(-1, 'unexpected_error', 'Quarter data is unavailable because the server response was invalid.', {
    contract: 'QuarterListItemDto',
    reason,
  });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable({ providedIn: 'root' })
export class AdminQuartersApiService {
  private readonly api = inject(ApiClient);
  private readonly organizations = inject(ActiveOrganizationService);
  private readonly auth = inject(AuthService);

  list(query: QuarterQuery): Observable<QuarterList> {
    return this.api
      .getData<QuarterListDto>('/admin/quarters', {
        params: {
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          ...(query.status ? { status: query.status } : {}),
          ...(query.search ? { search: query.search } : {}),
        },
      })
      .pipe(
        map((response) => {
          if (!response || !Array.isArray(response.items) || !validPagination(response.pagination)) {
            throw contractError('list envelope or pagination is invalid');
          }
          const active = this.organizations.activeWorkspace();
          const workspace = active ? { id: active.id, name: active.name } : null;
          return {
            items: response.items.map((item) => toQuarterRow(item, workspace, this.auth.capabilities())),
            pagination: response.pagination,
          };
        }),
      );
  }
  create(body: CreateQuarterRequest): Observable<QuarterListItemDto> {
    return this.api.postData<QuarterListItemDto>('/admin/quarters', body, adminMutationOptions());
  }
  update(id: string, body: UpdateQuarterRequest): Observable<QuarterListItemDto> {
    return this.api.patchData<QuarterListItemDto>(
      `/admin/quarters/${encodeURIComponent(id)}`,
      body,
      adminMutationOptions(body.expectedVersion),
    );
  }
  command(quarter: Quarter, action: Exclude<QuarterAction, 'edit'>): Observable<QuarterListItemDto> {
    return this.api.postData<QuarterListItemDto>(
      `/admin/quarters/${encodeURIComponent(quarter.id)}/${action}`,
      { expectedVersion: quarter.version },
      adminMutationOptions(quarter.version),
    );
  }
}

function validPagination(value: unknown): value is QuarterPagination {
  if (!isRecord(value)) return false;
  return ['page', 'pageSize', 'total', 'totalPages'].every((field) => {
    const entry = value[field];
    return typeof entry === 'number' && Number.isInteger(entry) && entry >= 0;
  });
}

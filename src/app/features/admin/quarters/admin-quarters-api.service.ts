import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';

export type QuarterStatus = 'draft' | 'active' | 'closed' | 'archived';
export type QuarterAction = 'edit' | 'activate' | 'close' | 'archive';
export type QuarterSort = '-updatedAt' | 'name' | 'startsOn';

export interface QuarterOrganization {
  readonly id: string;
  readonly name: string;
}
export interface Quarter {
  readonly id: string;
  readonly name: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly status: QuarterStatus;
  readonly organization?: QuarterOrganization | null;
  readonly updatedAt: string;
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
export interface QuarterQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: QuarterStatus;
  readonly search?: string;
  readonly sort: QuarterSort;
}
export interface CreateQuarterRequest {
  readonly name: string;
  readonly startsOn: string;
  readonly endsOn: string;
}
export interface UpdateQuarterRequest extends CreateQuarterRequest {
  readonly expectedVersion: number;
}
export interface QuarterCommandRequest {
  readonly expectedVersion: number;
}

/** Contract adapter for the admin-quarter OpenAPI operations. ApiClient unwraps `{ data }` exactly once. */
@Injectable({ providedIn: 'root' })
export class AdminQuartersApiService {
  private readonly api = inject(ApiClient);

  list(query: QuarterQuery): Observable<QuarterList> {
    return this.api.getData<QuarterList>('/admin/quarters', {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { search: query.search } : {}),
      },
    });
  }
  create(body: CreateQuarterRequest): Observable<Quarter> {
    return this.api.postData<Quarter>('/admin/quarters', body);
  }
  update(id: string, body: UpdateQuarterRequest): Observable<Quarter> {
    return this.api.patchData<Quarter>(`/admin/quarters/${encodeURIComponent(id)}`, body);
  }
  command(quarter: Quarter, action: Exclude<QuarterAction, 'edit'>): Observable<Quarter> {
    return this.api.postData<Quarter>(`/admin/quarters/${encodeURIComponent(quarter.id)}/${action}`, {
      expectedVersion: quarter.version,
    } satisfies QuarterCommandRequest);
  }
}

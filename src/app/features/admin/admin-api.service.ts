import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';
import { adminMutationOptions } from './admin-mutation';

export interface AdminRecord {
  readonly id: string;
  readonly label: string;
  readonly secondary?: string;
  readonly status: string;
  readonly version: number;
  /** Commands are server-authorized for this record; absence means read-only. */
  readonly allowedActions?: readonly string[];
  readonly updatedAt?: string;
  /** Privacy-filtered detail fields explicitly selected by the API. */
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface AdminPage {
  readonly items: readonly AdminRecord[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface AdminListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: string;
  readonly sort?: string;
  readonly search?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(ApiClient);

  list(resource: string, query: AdminListQuery): Observable<AdminPage> {
    const params: Record<string, string | number> = {
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
      ...(query.search ? { search: query.search } : {}),
    };
    return this.api.getData<AdminPage>(`/admin/${resource}`, { params });
  }

  detail(resource: string, id: string): Observable<AdminRecord> {
    return this.api.getData<AdminRecord>(`/admin/${resource}/${encodeURIComponent(id)}`);
  }

  create(resource: string, body: Readonly<Record<string, unknown>>, idempotencyKey = crypto.randomUUID()) {
    return this.api.postData<AdminRecord>(`/admin/${resource}`, body, adminMutationOptions(undefined, idempotencyKey));
  }

  update(resource: string, record: AdminRecord, body: Readonly<Record<string, unknown>>) {
    return this.api.patchData<AdminRecord>(
      `/admin/${resource}/${encodeURIComponent(record.id)}`,
      { ...body, version: record.version },
      adminMutationOptions(record.version),
    );
  }

  command(resource: string, record: AdminRecord, action: string): Observable<AdminRecord> {
    return this.api.postData<AdminRecord>(
      `/admin/${resource}/${encodeURIComponent(record.id)}/commands/${action}`,
      {
        version: record.version,
      },
      {
        ...adminMutationOptions(record.version),
      },
    );
  }
}

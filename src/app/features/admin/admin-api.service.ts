import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';

export interface AdminRecord {
  readonly id: string;
  readonly label: string;
  readonly secondary?: string;
  readonly status: string;
  readonly version: number;
  /** Commands are server-authorized for this record; absence means read-only. */
  readonly allowedActions?: readonly string[];
  readonly updatedAt?: string;
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
    };
    return this.api.getData<AdminPage>(`/admin/${resource}`, { params });
  }

  command(resource: string, record: AdminRecord, action: string): Observable<AdminRecord> {
    return this.api.postData<AdminRecord>(
      `/admin/${resource}/${encodeURIComponent(record.id)}/commands/${action}`,
      {
        version: record.version,
      },
      {
        headers: new HttpHeaders({ 'If-Match': `"${record.version}"` }),
      },
    );
  }
}

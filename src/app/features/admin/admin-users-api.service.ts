import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';
import { FirestoreTimestamp } from '../../shared/utilities/date-normalization';

export type UserStatus = 'active' | 'disabled' | 'suspended' | 'invited';

export interface AdminUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly status: UserStatus | string;
  readonly roles: readonly string[];
  readonly organizationIds: readonly string[];
  readonly updatedAt: string | Date | FirestoreTimestamp | null;
}

export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface AdminUsersPayload {
  readonly items: readonly AdminUser[];
  readonly pagination: Pagination;
}

export interface AdminUsersQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: UserStatus;
  readonly sort?: '-updatedAt' | 'displayName';
  readonly search?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly api = inject(ApiClient);

  /** ApiClient is the single envelope boundary; callers receive response.data directly. */
  listUsers(query: AdminUsersQuery): Observable<AdminUsersPayload> {
    return this.api.getData<AdminUsersPayload>('/admin/users', {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        ...(query.status ? { status: query.status } : {}),
        ...(query.sort ? { sort: query.sort } : {}),
        ...(query.search ? { search: query.search } : {}),
      },
    });
  }
}

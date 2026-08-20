import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';

export type OrganizationStatus = 'active' | 'inactive' | 'suspended';
export interface OrganizationSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly status: OrganizationStatus;
  readonly administratorCount?: number;
  readonly memberCount?: number;
  readonly updatedAt: string;
  readonly allowedActions: readonly ('edit' | 'activate' | 'deactivate')[];
}
export interface OrganizationListResponse {
  readonly items: readonly OrganizationSummary[];
  readonly canCreate: boolean;
}

/** Contract adapter: operationIds `listOrganizations` and `createOrganization`. */
@Injectable({ providedIn: 'root' })
export class AdminOrganizationsApiService {
  private readonly api = inject(ApiClient);
  list(search = ''): Observable<OrganizationListResponse> {
    return this.api.getData('/admin/organizations', { params: search ? { search } : {} });
  }
}

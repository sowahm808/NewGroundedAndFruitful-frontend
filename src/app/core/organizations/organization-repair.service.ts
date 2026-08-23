import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../http/api-client.service';

export interface OrganizationRepairResult {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly tokenRefreshRequired: boolean;
}

/**
 * Invokes the backend's ownership-verified, idempotent legacy-account repair.
 * No organization or role is supplied by the browser: both are resolved from
 * trusted ownership records by the authenticated backend.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationRepairService {
  private readonly api = inject(ApiClient);

  repair(): Observable<OrganizationRepairResult> {
    return this.api.postData<OrganizationRepairResult>('/onboarding/organization/repair', {});
  }
}

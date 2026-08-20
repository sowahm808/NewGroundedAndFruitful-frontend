import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';

/** DTO for operationId `bootstrapOrganization` (POST /onboarding/organization). */
export interface BootstrapOrganizationRequest {
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
}
export interface BootstrapOrganizationResponse {
  readonly organizationId: string;
  readonly tokenRefreshRequired: boolean;
  readonly nextStep?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationOnboardingApiService {
  private readonly api = inject(ApiClient);
  bootstrap(body: BootstrapOrganizationRequest): Observable<BootstrapOrganizationResponse> {
    return this.api.postData<BootstrapOrganizationResponse>('/onboarding/organization', body);
  }
}

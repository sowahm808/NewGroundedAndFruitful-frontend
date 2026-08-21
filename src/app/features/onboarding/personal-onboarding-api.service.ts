import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';

/** DTO for operationId `bootstrapPersonalWorkspace` (POST /onboarding/personal). */
export interface BootstrapPersonalWorkspaceRequest {
  readonly timezone: string;
}

export interface BootstrapPersonalWorkspaceResponse {
  readonly tokenRefreshRequired: boolean;
}

@Injectable({ providedIn: 'root' })
export class PersonalOnboardingApiService {
  private readonly api = inject(ApiClient);

  bootstrap(
    body: BootstrapPersonalWorkspaceRequest,
    idempotencyKey: string,
  ): Observable<BootstrapPersonalWorkspaceResponse> {
    return this.api.postData<BootstrapPersonalWorkspaceResponse>('/onboarding/personal', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }
}

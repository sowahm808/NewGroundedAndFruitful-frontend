import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../http/api-client.service';
import { ApiResponse } from '../models/domain.models';

export interface ChildTokenRequest {
  readonly familyCode: string;
  readonly handle: string;
  readonly pin: string;
}

interface ChildTokenResponse {
  readonly customToken: string;
}

/** Owns the anonymous, rate-limited child credential exchange contract. */
@Injectable({ providedIn: 'root' })
export class ChildAuthRepository {
  private readonly api = inject(ApiClient);

  async exchange(request: ChildTokenRequest): Promise<string> {
    const response = await firstValueFrom(
      this.api.post<ApiResponse<ChildTokenResponse>>('/auth/child-token', request, { anonymous: true }),
    );
    return response.data.customToken;
  }
}

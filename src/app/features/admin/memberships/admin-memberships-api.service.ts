import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { MembershipState, UserRole } from '../../../core/models/domain.models';
export interface MembershipSummary {
  readonly id: string;
  readonly member: { readonly displayName: string; readonly email?: string };
  readonly organization: { readonly id: string; readonly name: string };
  readonly roles: readonly UserRole[];
  readonly status: MembershipState;
  readonly updatedAt: string;
  readonly allowedActions: readonly ('edit_roles' | 'activate' | 'deactivate' | 'retry_invitation')[];
}
export interface MembershipListResponse {
  readonly items: readonly MembershipSummary[];
  readonly canInvite: boolean;
}
/** Contract adapter: operationIds `listMemberships`, `inviteMembership`, and `updateMembership`. */
@Injectable({ providedIn: 'root' })
export class AdminMembershipsApiService {
  private readonly api = inject(ApiClient);
  list(): Observable<MembershipListResponse> {
    return this.api.getData('/admin/memberships');
  }
  patch(id: string, body: unknown): Observable<MembershipSummary> {
    return this.api.patchData(`/admin/memberships/${encodeURIComponent(id)}`, body);
  }
}

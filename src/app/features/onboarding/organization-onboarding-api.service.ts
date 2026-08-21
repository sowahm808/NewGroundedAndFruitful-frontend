import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient, ApiEnvelope } from '../../core/http/api-client.service';

/** DTO for operationId `bootstrapOrganization` (POST /onboarding/organization). */
export interface BootstrapOrganizationRequest {
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
}

export interface BootstrapWorkspace {
  readonly id: string;
  readonly type: 'organization';
}

export interface BootstrapMembership {
  readonly organizationId: string;
  readonly status: 'active';
}

export interface BootstrapOrganizationResponse {
  readonly workspace: BootstrapWorkspace;
  readonly membership: BootstrapMembership;
  readonly activeWorkspaceId: string;
  readonly tokenRefreshRequired: boolean;
  readonly requestId?: string;
}

export interface BootstrapContractDiagnostics {
  readonly requestId?: string;
  readonly fields: readonly string[];
  readonly workspaceFields: readonly string[];
  readonly membershipFields: readonly string[];
}

export class BootstrapContractError extends Error {
  constructor(readonly diagnostics: BootstrapContractDiagnostics) {
    super('The organization was created, but the bootstrap response contract was invalid.');
    this.name = 'BootstrapContractError';
  }
}

/** Normalize the standard API envelope exactly once and validate the published DTO. */
export function normalizeBootstrapResponse(envelope: ApiEnvelope<unknown>): BootstrapOrganizationResponse {
  const data = isRecord(envelope?.data) ? envelope.data : undefined;
  const workspace = data && isRecord(data['workspace']) ? data['workspace'] : undefined;
  const membership = data && isRecord(data['membership']) ? data['membership'] : undefined;
  const diagnostics: BootstrapContractDiagnostics = {
    ...(typeof envelope?.requestId === 'string' ? { requestId: envelope.requestId } : {}),
    fields: fieldNames(data),
    workspaceFields: fieldNames(workspace),
    membershipFields: fieldNames(membership),
  };
  if (
    !workspace ||
    typeof workspace['id'] !== 'string' ||
    workspace['type'] !== 'organization' ||
    !membership ||
    typeof membership['organizationId'] !== 'string' ||
    membership['status'] !== 'active' ||
    typeof data?.['activeWorkspaceId'] !== 'string' ||
    typeof data['tokenRefreshRequired'] !== 'boolean' ||
    membership['organizationId'] !== workspace['id'] ||
    data['activeWorkspaceId'] !== workspace['id']
  ) {
    throw new BootstrapContractError(diagnostics);
  }
  return {
    workspace: { id: workspace['id'], type: 'organization' },
    membership: { organizationId: membership['organizationId'], status: 'active' },
    activeWorkspaceId: data['activeWorkspaceId'],
    tokenRefreshRequired: data['tokenRefreshRequired'],
    ...(diagnostics.requestId ? { requestId: diagnostics.requestId } : {}),
  };
}

@Injectable({ providedIn: 'root' })
export class OrganizationOnboardingApiService {
  private readonly api = inject(ApiClient);
  bootstrap(body: BootstrapOrganizationRequest, idempotencyKey: string): Observable<BootstrapOrganizationResponse> {
    return this.api
      .postResponse<ApiEnvelope<unknown>>('/onboarding/organization', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .pipe(
        map((response) => {
          const envelope = response.body;
          if (!envelope) throw new BootstrapContractError({ fields: [], workspaceFields: [], membershipFields: [] });
          const normalized = normalizeBootstrapResponse(envelope);
          console.info('Organization bootstrap confirmed', {
            status: response.status,
            requestId: normalized.requestId,
            workspacePresent: true,
            membershipPresent: true,
            activeWorkspaceIdPresent: true,
            tokenRefreshRequired: normalized.tokenRefreshRequired,
          });
          return normalized;
        }),
      );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldNames(value: Record<string, unknown> | undefined): readonly string[] {
  return value ? Object.keys(value).sort() : [];
}

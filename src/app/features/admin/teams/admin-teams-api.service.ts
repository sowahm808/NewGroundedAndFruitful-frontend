import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { AuthTokenProvider } from '../../../core/auth/auth-token-provider.service';
import { ApiClient } from '../../../core/http/api-client.service';
import { ApiError } from '../../../core/http/api-error';
import { adminMutationOptions } from '../admin-mutation';

export interface TeamItem {
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly approvedDisplayName?: string;
  readonly status: string;
  readonly capacity?: number;
  readonly memberCount?: number;
  readonly targetPoints?: number;
}

export interface CreateTeamCommand {
  readonly name: string;
  readonly capacity: number;
  readonly targetPoints: number;
  readonly organizationId: string;
}

@Injectable({ providedIn: 'root' })
export class AdminTeamsApiService {
  private readonly api = inject(ApiClient);
  private readonly tokens = inject(AuthTokenProvider);

  list(): Observable<readonly TeamItem[]> {
    return this.withOneAuthenticationRetry(() => this.api.getData<{ items: readonly TeamItem[] }>('/admin/teams')).pipe(
      map((result) => result.items),
    );
  }

  create(command: CreateTeamCommand): Observable<TeamItem> {
    const options = adminMutationOptions();
    return this.withOneAuthenticationRetry(() => this.api.postData<TeamItem>('/admin/teams', command, options));
  }

  /** A 401 can mean Firebase's cached ID token expired between session bootstrap and this command. */
  private withOneAuthenticationRetry<T>(request: () => Observable<T>): Observable<T> {
    return request().pipe(
      catchError((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) return throwError(() => error);
        return from(this.tokens.token(true)).pipe(switchMap(() => request()));
      }),
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';
export interface ObserverGrant {
  readonly participantId: string;
  readonly displayName: string;
  readonly expiresAt?: string;
}
export interface ObserverObservation {
  readonly id: string;
  readonly participantId: string;
  readonly participantName: string;
  readonly summary: string;
  readonly moderationStatus: string;
  readonly submittedAt: string;
}
@Injectable({ providedIn: 'root' })
export class ObserverApi {
  private readonly api = inject(ApiClient);
  grants(): Observable<readonly ObserverGrant[]> {
    return this.api.getData('/observer/grants');
  }
  observations(): Observable<readonly ObserverObservation[]> {
    return this.api.getData('/observer/observations');
  }
  submit(body: { participantId: string; summary: string }): Observable<ObserverObservation> {
    return this.api.postData('/observer/observations', body);
  }
}

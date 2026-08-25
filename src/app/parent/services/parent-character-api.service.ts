import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface CharacterQuality {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
}

export interface CharacterSelection {
  readonly childId: string;
  readonly quarterId?: string;
  readonly quarterName?: string;
  readonly selectedQualities: readonly string[];
  readonly version: number;
  readonly updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ParentCharacterApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/parent/character';

  getQualities(): Observable<readonly CharacterQuality[]> {
    return this.http
      .get<{ data: readonly CharacterQuality[] }>(`${this.baseUrl}/qualities`)
      .pipe(map((response) => response.data));
  }

  getSelection(childId: string, quarterId?: string): Observable<CharacterSelection> {
    let params = new HttpParams().set('childId', childId);
    if (quarterId) params = params.set('quarterId', quarterId);

    return this.http
      .get<{ data: CharacterSelection }>(`${this.baseUrl}/selection`, { params })
      .pipe(map((response) => response.data));
  }

  saveSelection(payload: {
    childId: string;
    qualityIds: string[];
    expectedVersion?: number;
  }): Observable<CharacterSelection> {
    return this.http
      .post<{ data: CharacterSelection }>(`${this.baseUrl}/selection`, payload)
      .pipe(map((response) => response.data));
  }
}

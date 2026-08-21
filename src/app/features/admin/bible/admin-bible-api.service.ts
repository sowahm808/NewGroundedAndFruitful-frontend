import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';

export type BibleContentStatus =
  'draft' | 'uploaded' | 'parsing' | 'needs_review' | 'validated' | 'published' | 'archived' | 'failed';
export type BibleContentAction = 'view' | 'continue_review' | 'edit' | 'validate' | 'publish' | 'archive';
export type BibleContentSort = '-updatedAt' | 'title' | 'startDate';

export interface BibleContentSet {
  readonly id: string;
  readonly title: string;
  readonly quarterId: string;
  readonly quarterName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly activityCount: number;
  readonly status: BibleContentStatus;
  readonly version: number;
  readonly updatedAt: string;
  readonly allowedActions: readonly BibleContentAction[];
  readonly importId?: string;
}
export interface BiblePagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}
export interface BibleContentList {
  readonly items: readonly BibleContentSet[];
  readonly pagination: BiblePagination;
  readonly aggregates?: Readonly<Partial<Record<'draft' | 'needs_review' | 'published' | 'archived', number>>> & {
    readonly total?: number;
  };
}
export interface BibleContentQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly quarterId?: string;
  readonly status?: BibleContentStatus;
  readonly search?: string;
  readonly sort: BibleContentSort;
}
export interface BibleImportCreated {
  readonly id: string;
  readonly status: BibleContentStatus;
}
export interface CreateBibleContentImportInput {
  readonly organizationId: string;
  readonly quarterId: string;
  readonly title: string;
  readonly quizFile: File;
  readonly answerKeyFile: File;
  /** Caller-owned key which must be reused when retrying the same logical upload. */
  readonly idempotencyKey: string;
}
export interface BibleImportReview {
  readonly id: string;
  readonly contentTitle: string;
  readonly quarterName: string;
  readonly questionFilename: string;
  readonly answerKeyFilename: string;
  readonly status: BibleContentStatus;
  readonly activityCount: number;
  readonly questionCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminBibleApiService {
  private readonly api = inject(ApiClient);

  list(query: BibleContentQuery): Observable<BibleContentList> {
    return this.api.getData<BibleContentList>('/admin/bible-content', {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        ...(query.quarterId ? { quarterId: query.quarterId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { search: query.search } : {}),
      },
    });
  }

  createBibleContentImport(input: CreateBibleContentImportInput): Observable<BibleImportCreated> {
    const body = new FormData();
    body.append('organizationId', input.organizationId);
    body.append('quarterId', input.quarterId);
    body.append('title', input.title.trim());
    body.append('quizFile', input.quizFile, input.quizFile.name);
    body.append('answerKeyFile', input.answerKeyFile, input.answerKeyFile.name);
    return this.api.postData<BibleImportCreated>('/admin/bible-content/imports', body, {
      headers: { 'Idempotency-Key': input.idempotencyKey },
    });
  }

  getImport(id: string) {
    return this.api.getData<BibleImportReview>(`/admin/bible-content/imports/${encodeURIComponent(id)}`);
  }

  getContent(id: string) {
    return this.api.getData<BibleContentSet>(`/admin/bible-content/${encodeURIComponent(id)}`);
  }
}

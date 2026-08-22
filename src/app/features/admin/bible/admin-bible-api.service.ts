import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
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
export type BibleImportStatus =
  'processing' | 'needs_correction' | 'needs_review' | 'rejected' | 'committed' | 'processing_failed';
export type BibleImportAction =
  'review' | 'continue_review' | 'reprocess' | 'commit' | 'reject' | 'cancel' | 'view_committed_content';
export interface BibleImportDocument {
  readonly filename: string;
  readonly sizeBytes: number;
  readonly downloadUrl?: string;
  readonly viewUrl?: string;
}
export interface BibleImportIssue {
  readonly code: string;
  readonly message: string;
  readonly blocking: boolean;
  readonly activityId?: string;
  readonly questionNumber?: number;
}
export interface BibleImportChoice {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
}
export interface BibleImportQuestion {
  readonly number: number;
  readonly prompt: string;
  readonly choices: readonly BibleImportChoice[];
  readonly issues: readonly BibleImportIssue[];
}
export interface BibleImportActivity {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly questions: readonly BibleImportQuestion[];
}
export interface BibleImportReview {
  readonly id: string;
  readonly title: string;
  readonly quarter: { readonly id: string; readonly name: string };
  readonly documents: { readonly question: BibleImportDocument; readonly answerKey: BibleImportDocument };
  readonly status: BibleImportStatus;
  readonly activityCount: number;
  readonly questionCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly uploadedBy: string;
  readonly uploadedAt: string;
  readonly updatedAt: string;
  readonly parserVersion: string;
  readonly version: number;
  readonly allowedActions: readonly BibleImportAction[];
  readonly reviewBlock?: { readonly code: string; readonly reason: string };
  readonly validation: {
    readonly dateRange?: string;
    readonly reconciliation?: string;
    readonly diagnostics?: string;
    readonly issues: readonly BibleImportIssue[];
  };
  readonly activities: readonly BibleImportActivity[];
  readonly committedContentSetId?: string;
}

export interface BibleImportList {
  readonly items: readonly BibleImportReview[];
  readonly pagination: BiblePagination;
  readonly aggregates: Readonly<Partial<Record<BibleImportStatus, number>>>;
}
export interface BibleCommitResult {
  readonly importId: string;
  readonly committedContentSetId: string;
  readonly status: 'committed';
  readonly version: number;
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
    return this.api
      .getData<unknown>(`/admin/bible-content/imports/${encodeURIComponent(id)}`)
      .pipe(map(normalizeImport));
  }

  listImports(page = 1, pageSize = 25) {
    return this.api
      .getData<unknown>('/admin/bible-content/imports', { params: { page, pageSize, sort: '-updatedAt' } })
      .pipe(map(normalizeImportList));
  }

  commitImport(id: string, expectedVersion: number, idempotencyKey: string) {
    return this.api.postData<BibleCommitResult>(
      `/admin/bible-content/imports/${encodeURIComponent(id)}/commit`,
      { expectedVersion },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  reprocessImport(id: string, expectedVersion: number) {
    return this.api.postData<unknown>(`/admin/bible-content/imports/${encodeURIComponent(id)}/reprocess`, {
      expectedVersion,
    });
  }

  rejectImport(id: string, expectedVersion: number, reason: string) {
    return this.api.postData<unknown>(`/admin/bible-content/imports/${encodeURIComponent(id)}/reject`, {
      expectedVersion,
      reason,
    });
  }

  getContent(id: string) {
    return this.api.getData<BibleContentSet>(`/admin/bible-content/${encodeURIComponent(id)}`);
  }
}

function normalizeImportList(value: unknown): BibleImportList {
  const row = record(value, 'import list');
  if (!Array.isArray(row['items'])) contract('imports.items');
  const pagination = record(row['pagination'], 'imports.pagination') as unknown as BiblePagination;
  return {
    items: row['items'].map(normalizeImport),
    pagination,
    aggregates: (row['aggregates'] ?? {}) as BibleImportList['aggregates'],
  };
}

/** The only DTO boundary for import detail. Backend document fields are nested under documents. */
export function normalizeImport(value: unknown): BibleImportReview {
  const row = record(value, 'import');
  const documents = record(row['documents'], 'documents');
  const counts = record(row['counts'], 'counts');
  const quarter = record(row['quarter'], 'quarter');
  const validation = record(row['validation'] ?? {}, 'validation');
  const activities = requiredArray(row['activities'], 'activities').map((raw) => {
    const activity = record(raw, 'activity');
    return {
      id: textField(activity, 'id'),
      title: textField(activity, 'title'),
      date: textField(activity, 'date'),
      questions: requiredArray(activity['questions'], 'activity.questions').map((rawQuestion) => {
        const question = record(rawQuestion, 'question');
        return {
          number: numberField(question, 'number'),
          prompt: textField(question, 'prompt'),
          issues: issues(question['issues']),
          choices: requiredArray(question['choices'], 'question.choices').map((rawChoice) => {
            const choice = record(rawChoice, 'choice');
            return {
              id: textField(choice, 'id'),
              text: textField(choice, 'text'),
              isCorrect: booleanField(choice, 'isCorrect'),
            };
          }),
        };
      }),
    };
  });
  const block = row['reviewBlock'] == null ? undefined : record(row['reviewBlock'], 'reviewBlock');
  return {
    id: textField(row, 'id'),
    title: textField(row, 'title'),
    status: textField(row, 'status') as BibleImportStatus,
    quarter: { id: textField(quarter, 'id'), name: textField(quarter, 'name') },
    documents: {
      question: document(documents['question'], 'documents.question'),
      answerKey: document(documents['answerKey'], 'documents.answerKey'),
    },
    activityCount: numberField(counts, 'activities'),
    questionCount: numberField(counts, 'questions'),
    errorCount: numberField(counts, 'errors'),
    warningCount: numberField(counts, 'warnings'),
    uploadedBy: textField(row, 'uploadedBy'),
    uploadedAt: textField(row, 'uploadedAt'),
    updatedAt: textField(row, 'updatedAt'),
    parserVersion: textField(row, 'parserVersion'),
    version: numberField(row, 'version'),
    allowedActions: requiredArray(row['allowedActions'], 'allowedActions') as BibleImportAction[],
    ...(block ? { reviewBlock: { code: textField(block, 'code'), reason: textField(block, 'reason') } } : {}),
    validation: {
      ...(typeof validation['dateRange'] === 'string' ? { dateRange: validation['dateRange'] } : {}),
      ...(typeof validation['reconciliation'] === 'string' ? { reconciliation: validation['reconciliation'] } : {}),
      ...(typeof validation['diagnostics'] === 'string' ? { diagnostics: validation['diagnostics'] } : {}),
      issues: issues(validation['issues']),
    },
    activities,
    ...(typeof row['committedContentSetId'] === 'string'
      ? { committedContentSetId: row['committedContentSetId'] }
      : {}),
  };
}
function document(value: unknown, field: string): BibleImportDocument {
  const row = record(value, field);
  return {
    filename: textField(row, 'filename'),
    sizeBytes: numberField(row, 'sizeBytes'),
    ...(typeof row['downloadUrl'] === 'string' ? { downloadUrl: row['downloadUrl'] } : {}),
    ...(typeof row['viewUrl'] === 'string' ? { viewUrl: row['viewUrl'] } : {}),
  };
}
function issues(value: unknown): BibleImportIssue[] {
  return requiredArray(value ?? [], 'issues').map((raw) => {
    const row = record(raw, 'issue');
    return {
      code: textField(row, 'code'),
      message: textField(row, 'message'),
      blocking: booleanField(row, 'blocking'),
      ...(typeof row['activityId'] === 'string' ? { activityId: row['activityId'] } : {}),
      ...(typeof row['questionNumber'] === 'number' ? { questionNumber: row['questionNumber'] } : {}),
    };
  });
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) contract(field);
  return value as Record<string, unknown>;
}
function requiredArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) contract(field);
  return value;
}
function textField(row: Record<string, unknown>, field: string): string {
  if (typeof row[field] !== 'string' || !(row[field] as string).trim()) contract(field);
  return row[field] as string;
}
function numberField(row: Record<string, unknown>, field: string): number {
  if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) contract(field);
  return row[field] as number;
}
function booleanField(row: Record<string, unknown>, field: string): boolean {
  if (typeof row[field] !== 'boolean') contract(field);
  return row[field] as boolean;
}
function contract(field: string): never {
  throw new ApiError(-1, 'unexpected_error', `The backend response is missing required field “${field}”.`);
}

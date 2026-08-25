import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { ApiClient } from '../../../core/http/api-client.service';
import { adminMutationOptions } from '../admin-mutation';

export type BibleContentStatus =
  | 'draft'
  | 'uploaded'
  | 'parsing'
  | 'needs_review'
  | 'validated'
  | 'published'
  | 'archived'
  | 'failed';
export type BibleContentAction = 'view' | 'continue_review' | 'edit' | 'validate' | 'publish' | 'archive';
export type BibleContentSort = '-updatedAt' | 'title' | 'startDate';

export interface BibleContentSet {
  readonly id: string;
  readonly title: string;
  readonly quarterId?: string;
  readonly quarterName?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly activityCount: number;
  readonly status: BibleContentStatus;
  readonly version: number;
  readonly updatedAt?: string;
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
  | 'draft'
  | 'processing'
  | 'needs_correction'
  | 'needs_review'
  | 'rejected'
  | 'committed'
  | 'processing_failed';
export type BibleImportAction =
  | 'review'
  | 'continue_review'
  | 'reprocess'
  | 'commit'
  | 'reject'
  | 'cancel'
  | 'view_committed_content';

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
  /** Parsers may not detect a date; the review must still expose the activity and its validation issues. */
  readonly date?: string;
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
    return this.api
      .get<unknown>('/admin/bible-content', {
        params: {
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          ...(query.quarterId ? { quarterId: query.quarterId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.search ? { search: query.search } : {}),
        },
      })
      .pipe(map((value) => normalizeList(value, query.page, query.pageSize)));
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
      .get<unknown>('/admin/bible-content/imports', { params: { page, pageSize, sort: '-updatedAt' } })
      .pipe(map((value) => normalizeImportList(value, page, pageSize)));
  }

  commitImport(id: string, expectedVersion: number, idempotencyKey: string) {
    return this.api.postData<BibleCommitResult>(
      `/admin/bible-content/imports/${encodeURIComponent(id)}/commit`,
      { expectedVersion },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  reprocessImport(id: string, expectedVersion: number) {
    return this.api.postData<unknown>(
      `/admin/bible-content/imports/${encodeURIComponent(id)}/reprocess`,
      { expectedVersion },
      adminMutationOptions(expectedVersion),
    );
  }

  rejectImport(id: string, expectedVersion: number, reason: string) {
    return this.api.postData<unknown>(
      `/admin/bible-content/imports/${encodeURIComponent(id)}/reject`,
      { expectedVersion, reason },
      adminMutationOptions(expectedVersion),
    );
  }

  getContent(id: string) {
    return this.api.getData<unknown>(`/admin/bible-content/${encodeURIComponent(id)}`).pipe(map(normalizeContentSet));
  }

  publishContent(id: string, expectedVersion: number) {
    return this.api.postData<unknown>(
      `/admin/bible-content/${encodeURIComponent(id)}/publish`,
      { expectedVersion },
      adminMutationOptions(expectedVersion),
    );
  }

  archiveContent(id: string, expectedVersion: number) {
    return this.api.postData<unknown>(
      `/admin/bible-content/${encodeURIComponent(id)}/archive`,
      { expectedVersion },
      adminMutationOptions(expectedVersion),
    );
  }
}

function normalizeContentSet(value: unknown): BibleContentSet {
  const row = record(value, 'contentSet');
  return {
    id: textField(row, 'id'),
    title: textField(row, 'title'),
    quarterId: optionalTextField(row, 'quarterId'),
    quarterName: optionalTextField(row, 'quarterName') ?? '—',
    startDate: optionalTextField(row, 'startDate'),
    endDate: optionalTextField(row, 'endDate'),
    activityCount: typeof row['activityCount'] === 'number' ? row['activityCount'] : 0,
    status: (optionalTextField(row, 'status') ?? 'draft') as BibleContentStatus,
    version: typeof row['version'] === 'number' ? row['version'] : 1,
    updatedAt: optionalTextField(row, 'updatedAt'),
    allowedActions: Array.isArray(row['allowedActions'])
      ? (row['allowedActions'] as readonly BibleContentAction[])
      : (['view', 'edit', 'publish', 'archive'] as readonly BibleContentAction[]),
    importId: optionalTextField(row, 'importId'),
  };
}

function normalizeList(value: unknown, page: number, pageSize: number): BibleContentList {
  const { items, pagination, aggregates } = collectionParts(value, page, pageSize, 'content');
  return {
    items: items.map(normalizeContentSet),
    pagination,
    ...(aggregates ? { aggregates: aggregates as BibleContentList['aggregates'] } : {}),
  };
}

function normalizeImportList(value: unknown, page: number, pageSize: number): BibleImportList {
  const { items, pagination, aggregates } = collectionParts(value, page, pageSize, 'imports');
  return {
    items: items.map(normalizeImport),
    pagination,
    aggregates: (aggregates ?? {}) as BibleImportList['aggregates'],
  };
}

function collectionParts(value: unknown, page: number, pageSize: number, field: string) {
  const envelope = record(value, `${field} response`);
  const data = envelope['data'];
  const row = Array.isArray(data) ? undefined : record(data, `${field}.data`);
  const items = Array.isArray(data) ? data : row?.['items'];
  if (!Array.isArray(items)) contract(`${field}.items`);

  const nestedPagination = optionalRecord(row?.['pagination']);
  const topPagination = optionalRecord(envelope['pagination']);
  const meta = optionalRecord(envelope['meta']);
  const total = numberValue(nestedPagination?.['total'] ?? meta?.['total'] ?? topPagination?.['total'], items.length);
  const normalizedPage = numberValue(nestedPagination?.['page'] ?? meta?.['page'] ?? topPagination?.['page'], page);
  const normalizedPageSize = numberValue(
    nestedPagination?.['pageSize'] ?? meta?.['pageSize'] ?? topPagination?.['pageSize'],
    pageSize,
  );
  return {
    items,
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total,
      totalPages: numberValue(
        nestedPagination?.['totalPages'] ?? meta?.['totalPages'] ?? topPagination?.['totalPages'],
        total ? Math.ceil(total / normalizedPageSize) : 0,
      ),
    } satisfies BiblePagination,
    aggregates: row?.['aggregates'] ?? envelope['aggregates'],
  };
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function normalizeImport(value: unknown): BibleImportReview {
  const row = record(value, 'import');
  const documents = record(row['documents'] ?? {}, 'documents');
  const counts = record(row['counts'] ?? {}, 'counts');
  const quarter = record(row['quarter'] ?? {}, 'quarter');
  const validation = record(row['validation'] ?? {}, 'validation');
  const activities = (Array.isArray(row['activities']) ? row['activities'] : []).map((raw) => {
    const activity = record(raw, 'activity');
    const date = optionalTextField(activity, 'date');
    return {
      id: textField(activity, 'id'),
      title: textField(activity, 'title'),
      ...(date ? { date } : {}),
      questions: (Array.isArray(activity['questions']) ? activity['questions'] : []).map((rawQuestion) => {
        const question = record(rawQuestion, 'question');
        return {
          number: typeof question['number'] === 'number' ? question['number'] : 1,
          prompt: textField(question, 'prompt'),
          issues: issues(question['issues']),
          choices: (Array.isArray(question['choices']) ? question['choices'] : []).map((rawChoice) => {
            const choice = record(rawChoice, 'choice');
            return {
              id: textField(choice, 'id'),
              text: textField(choice, 'text'),
              isCorrect: typeof choice['isCorrect'] === 'boolean' ? choice['isCorrect'] : false,
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
    status: (optionalTextField(row, 'status') ?? 'draft') as BibleImportStatus,
    quarter: { id: optionalTextField(quarter, 'id') ?? '', name: optionalTextField(quarter, 'name') ?? '—' },
    documents: {
      question: document(documents['question'], 'documents.question'),
      answerKey: document(documents['answerKey'], 'documents.answerKey'),
    },
    activityCount: typeof counts['activities'] === 'number' ? counts['activities'] : 0,
    questionCount: typeof counts['questions'] === 'number' ? counts['questions'] : 0,
    errorCount: typeof counts['errors'] === 'number' ? counts['errors'] : 0,
    warningCount: typeof counts['warnings'] === 'number' ? counts['warnings'] : 0,
    uploadedBy: optionalTextField(row, 'uploadedBy') ?? '—',
    uploadedAt: optionalTextField(row, 'uploadedAt') ?? new Date().toISOString(),
    updatedAt: optionalTextField(row, 'updatedAt') ?? new Date().toISOString(),
    parserVersion: optionalTextField(row, 'parserVersion') ?? 'v1',
    version: typeof row['version'] === 'number' ? row['version'] : 1,
    allowedActions: Array.isArray(row['allowedActions'])
      ? (row['allowedActions'] as readonly BibleImportAction[])
      : ['review'],
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
  const row = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    filename: optionalTextField(row, 'filename') ?? '—',
    sizeBytes: typeof row['sizeBytes'] === 'number' ? row['sizeBytes'] : 0,
    ...(typeof row['downloadUrl'] === 'string' ? { downloadUrl: row['downloadUrl'] } : {}),
    ...(typeof row['viewUrl'] === 'string' ? { viewUrl: row['viewUrl'] } : {}),
  };
}

function issues(value: unknown): BibleImportIssue[] {
  return (Array.isArray(value) ? value : []).map((raw) => {
    const row = record(raw, 'issue');
    return {
      code: textField(row, 'code'),
      message: textField(row, 'message'),
      blocking: typeof row['blocking'] === 'boolean' ? row['blocking'] : false,
      ...(typeof row['activityId'] === 'string' ? { activityId: row['activityId'] } : {}),
      ...(typeof row['questionNumber'] === 'number' ? { questionNumber: row['questionNumber'] } : {}),
    };
  });
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) contract(field);
  return value as Record<string, unknown>;
}

function textField(row: Record<string, unknown>, field: string): string {
  if (typeof row[field] !== 'string' || !(row[field] as string).trim()) contract(field);
  return row[field] as string;
}

function optionalTextField(row: Record<string, unknown>, field: string): string | undefined {
  const value = row[field];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function contract(field: string): never {
  throw new ApiError(-1, 'unexpected_error', `The backend response is missing required field “${field}”.`);
}
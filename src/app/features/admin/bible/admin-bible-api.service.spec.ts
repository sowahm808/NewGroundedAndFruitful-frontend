import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../../core/http/api-error';
import { AdminBibleApiService, BibleImportReview } from './admin-bible-api.service';

describe('AdminBibleApiService', () => {
  let service: AdminBibleApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminBibleApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('normalizes the Bible list envelope once and sends server filters', () => {
    let result: unknown;
    service
      .list({ page: 2, pageSize: 25, quarterId: 'q1', status: 'draft', search: 'quiz', sort: 'title' })
      .subscribe((value) => (result = value));
    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/bible-content'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('quarterId')).toBe('q1');
    const payload = { items: [], pagination: { page: 2, pageSize: 25, total: 0, totalPages: 0 } };
    request.flush({ data: payload });
    expect(result).toEqual(payload);
  });

  it('sends exactly the canonical multipart contract with native files and no manual content type', () => {
    const question = new File(['questions'], 'questions.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const answer = new File(['answers'], 'answers.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    service
      .createBibleContentImport({
        organizationId: 'org-1',
        quarterId: 'q1',
        title: '  Autumn quiz  ',
        quizFile: question,
        answerKeyFile: answer,
        idempotencyKey: 'logical-import-1',
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/bible-content/imports'));
    const body = request.request.body as FormData;
    expect([...body.keys()]).toEqual(['organizationId', 'quarterId', 'title', 'quizFile', 'answerKeyFile']);
    expect(body.get('organizationId')).toBe('org-1');
    expect(body.get('title')).toBe('Autumn quiz');
    expect(body.get('quarterId')).toBe('q1');
    expect(body.get('quizFile')).toBe(question);
    expect(body.get('answerKeyFile')).toBe(answer);
    expect(body.get('quizFile')).toEqual(jasmine.any(File));
    expect(request.request.headers.has('Content-Type')).toBeFalse();
    expect(request.request.headers.get('Idempotency-Key')).toBe('logical-import-1');
    request.flush({ data: { id: 'import-1', status: 'uploaded' } });
  });

  it('normalizes nested import documents and commits with version and one idempotency key', () => {
    let detail: BibleImportReview | undefined;
    service.getImport('import/1').subscribe((value) => (detail = value));
    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/bible-content/imports/import%2F1'));
    request.flush({
      data: {
        id: 'import/1',
        title: 'Autumn Bible quiz',
        status: 'needs_review',
        quarter: { id: 'q1', name: 'Autumn 2026' },
        documents: {
          question: { filename: 'questions.docx', sizeBytes: 1024 },
          answerKey: { filename: 'answers.docx', sizeBytes: 512 },
        },
        counts: { activities: 1, questions: 1, errors: 0, warnings: 1 },
        uploadedBy: 'Admin User',
        uploadedAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-20T10:01:00Z',
        parserVersion: '2.1.0',
        version: 4,
        allowedActions: ['commit'],
        validation: { issues: [{ code: 'spacing', message: 'Spacing normalized.', blocking: false }] },
        activities: [
          {
            id: 'a1',
            title: 'Day one',
            date: '2026-09-01',
            questions: [
              { number: 1, prompt: 'Who?', choices: [{ id: 'a', text: 'Moses', isCorrect: true }], issues: [] },
            ],
          },
        ],
      },
    });
    expect(detail?.documents.question.filename).toBe('questions.docx');
    expect(detail?.activities[0].questions[0].choices[0].isCorrect).toBeTrue();

    service.commitImport('import/1', 4, 'approval-1').subscribe();
    const commit = http.expectOne((candidate) =>
      candidate.url.endsWith('/admin/bible-content/imports/import%2F1/commit'),
    );
    expect(commit.request.body).toEqual({ expectedVersion: 4 });
    expect(commit.request.headers.get('Idempotency-Key')).toBe('approval-1');
    commit.flush({
      data: { importId: 'import/1', committedContentSetId: 'content-1', status: 'committed', version: 5 },
    });
  });

  it('fails incomplete detail as a contract error instead of rendering blank metadata', () => {
    let failure: ApiError | undefined;
    service.getImport('bad').subscribe({ error: (error) => (failure = error) });
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/bible-content/imports/bad'))
      .flush({ data: { id: 'bad' } });
    expect(failure?.message).toContain('documents');
  });

  it('keeps an import reviewable when the parser did not detect an activity date', () => {
    let detail: BibleImportReview | undefined;
    service.getImport('missing-date').subscribe((value) => (detail = value));
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/bible-content/imports/missing-date'))
      .flush({
        data: {
          id: 'missing-date',
          title: 'Quiz requiring review',
          status: 'needs_correction',
          quarter: { id: 'q1', name: 'Autumn 2026' },
          documents: {
            question: { filename: 'questions.docx', sizeBytes: 1024 },
            answerKey: { filename: 'answers.docx', sizeBytes: 512 },
          },
          counts: { activities: 1, questions: 0, errors: 1, warnings: 0 },
          uploadedBy: 'Admin User',
          uploadedAt: '2026-08-20T10:00:00Z',
          updatedAt: '2026-08-20T10:01:00Z',
          parserVersion: '2.1.0',
          version: 1,
          allowedActions: ['reprocess', 'reject'],
          validation: {
            issues: [{ code: 'missing_date', message: 'No activity date was detected.', blocking: true }],
          },
          activities: [{ id: 'a1', title: 'Day one', questions: [] }],
        },
      });

    expect(detail?.activities[0].date).toBeUndefined();
    expect(detail?.validation.issues[0].code).toBe('missing_date');
  });
});

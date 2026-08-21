import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminBibleApiService } from './admin-bible-api.service';

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
    request.flush({ data: { id: 'import-1', status: 'uploaded' } });
  });
});

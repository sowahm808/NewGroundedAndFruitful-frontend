import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ChildApi, MediaPolicy, validatePrivateMedia } from './child-api.service';

describe('ChildApi', () => {
  let api: ChildApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ChildApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('unwraps the dashboard envelope without calculating progress', () => {
    const server = {
      quarter: undefined,
      activities: {
        checkIn: 'not_configured',
        gratitude: 'not_configured',
        character: 'not_configured',
        bible: 'not_configured',
        reading: 'not_configured',
        project: 'not_configured',
      },
      individualContribution: 0,
      team: { name: 'Team', compositePoints: 2, target: 9, progressPercent: 17 },
      calculatedAt: '2026-08-19T12:00:00Z',
    } as const;
    let actual: unknown;
    api.today().subscribe((value) => (actual = value));
    http.expectOne(`${environment.apiUrl}/child/today`).flush({ data: server });
    expect(actual).toBe(server);
  });

  it('sends one character command with a stable caller-owned idempotency key', () => {
    const responses = [{ qualityId: 'q-1', rating: 0 }];
    api.completeCharacter(responses, 3, 'stable-key').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/child/character/complete`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('stable-key');
    expect(request.request.body).toEqual({ responses, version: 3 });
    request.flush({ data: { status: 'completed', calculatedAt: '2026-08-19T12:00:00Z' } });
  });

  it('keeps private gratitude text in the request body, never the URL', () => {
    api.submitGratitude('private words', 'key').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/child/gratitude`);
    expect(request.request.urlWithParams).not.toContain('private');
    expect(request.request.body).toEqual({ text: 'private words' });
    request.flush({ data: { id: 'g', localDate: '2026-08-19', text: 'private words', status: 'completed' } });
  });
});

describe('private media validation', () => {
  const policy: MediaPolicy = {
    allowedMimeTypes: ['audio/webm', 'video/webm'],
    maximumBytes: 10,
    uploadTargetEndpoint: '/upload',
    captionsRequired: true,
  };
  it('accepts configured media and rejects type and size violations', () => {
    expect(validatePrivateMedia({ type: 'audio/webm', size: 10 }, policy)).toBeNull();
    expect(validatePrivateMedia({ type: 'image/png', size: 1 }, policy)).toContain('type');
    expect(validatePrivateMedia({ type: 'video/webm', size: 11 }, policy)).toContain('smaller');
  });
});

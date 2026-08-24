import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ParentApi } from './parent-api.service';

describe('ParentApi', () => {
  let api: ParentApi;
  let http: HttpTestingController;
  const baseUrl = environment.apiUrl.replace(/\/$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ParentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('omits empty filters from the children request URL', () => {
    api.children('', ' ', '').subscribe();
    http.expectOne(`${baseUrl}/parent/children`).flush({ data: { items: [], hasMore: false } });
  });

  it('includes populated search, status, and cursor in the children request URL', () => {
    api.children('Ada', 'active', 'next').subscribe();
    http
      .expectOne(`${baseUrl}/parent/children?search=Ada&status=active&cursor=next`)
      .flush({ data: { items: [], hasMore: false } });
  });

  it('normalizes a successful empty data/meta collection without treating null cursor as a contract error', () => {
    let result: unknown;
    api.children().subscribe((page) => (result = page));
    http.expectOne(`${baseUrl}/parent/children`).flush({ data: [], meta: { nextCursor: null } });
    expect(result).toEqual({ items: [], hasMore: false });
  });

  it('turns a malformed linked-child contract into a handled ApiError', () => {
    let failure: unknown;
    api.children().subscribe({ error: (error) => (failure = error) });
    http.expectOne(`${baseUrl}/parent/children`).flush({ data: [{ id: '' }], meta: { nextCursor: null } });
    expect(failure).toEqual(jasmine.objectContaining({ name: 'ApiError', status: -1 }));
  });

  it('reconciles approved names, team names, and progress summaries', () => {
    let child: unknown;
    api.children().subscribe((page) => (child = page.items[0]));
    http.expectOne(`${baseUrl}/parent/children`).flush({
      data: {
        items: [
          {
            id: 'participant-123',
            approvedDisplayName: '',
            displayName: '  Ama  ',
            status: 'active',
            team: { id: 'team-1', approvedDisplayName: '', name: 'Seedlings' },
            weeklyParticipation: { completed: 3, available: 5 },
            teamProgress: { completed: 4, target: 8 },
          },
        ],
        hasMore: false,
      },
    });

    expect(child).toEqual(
      jasmine.objectContaining({
        approvedDisplayName: 'Ama',
        displayName: 'Ama',
        team: { id: 'team-1', name: 'Seedlings' },
        weeklyParticipation: { completed: 3, available: 5 },
        teamProgress: { completed: 4, target: 8 },
      }),
    );
  });

  it('provides a stable participant fallback when every server name is blank', () => {
    let displayName = '';
    api.children().subscribe((page) => (displayName = page.items[0].approvedDisplayName));
    http.expectOne(`${baseUrl}/parent/children`).flush({
      data: { items: [{ id: 'abcdef123', approvedDisplayName: '', status: 'active' }], hasMore: false },
    });

    expect(displayName).toBe('Participant (abcdef)');
  });

  it('reconciles legacy team identifiers and structured reading progress', () => {
    let child: unknown;
    api.children().subscribe((page) => (child = page.items[0]));
    http.expectOne(`${baseUrl}/parent/children`).flush({
      data: {
        items: [
          {
            id: 'participant-123',
            name: 'Ama',
            status: 'active',
            activeTeamId: 'team-legacy',
            readingProgress: { completed: 2, target: 4 },
          },
        ],
        hasMore: false,
      },
    });

    expect(child).toEqual(
      jasmine.objectContaining({
        team: { id: 'team-legacy', name: 'Growth Team' },
        readingProgress: '2 of 4',
      }),
    );
  });

  it('omits empty child and cursor values from the observations request URL', () => {
    api.observations().subscribe();
    http.expectOne(`${baseUrl}/parent/observations`).flush({ data: { items: [], hasMore: false } });
  });

  it('normalizes observations returned as an array or a nested data collection', () => {
    const observation = {
      id: 'observation-1',
      childId: 'child-1',
      summary: 'Showed patience',
      status: 'submitted',
      submittedAt: '2026-08-24T00:00:00Z',
    };
    const results: number[] = [];

    api.observations('child-1').subscribe((page) => results.push(page.items.length));
    http.expectOne(`${baseUrl}/parent/observations?childId=child-1`).flush({ data: [observation] });
    api.observations('child-1').subscribe((page) => results.push(page.items.length));
    http.expectOne(`${baseUrl}/parent/observations?childId=child-1`).flush({ data: { data: [observation] } });

    expect(results).toEqual([1, 1]);
  });

  it('falls back to an empty observations collection when the response has no list', () => {
    let itemCount = -1;
    api.observations('child-1').subscribe((page) => (itemCount = page.items.length));
    http.expectOne(`${baseUrl}/parent/observations?childId=child-1`).flush({ data: {} });
    expect(itemCount).toBe(0);
  });

  it('omits an empty cursor from the academic-support request URL and accepts an empty 200 list', () => {
    let itemCount = -1;
    api.supportRequests().subscribe((page) => (itemCount = page.items.length));
    http
      .expectOne(`${baseUrl}/parent/academic-support/requests`)
      .flush({ data: { items: [], hasMore: false } }, { headers: { 'Cache-Control': 'no-store' } });
    expect(itemCount).toBe(0);
  });

  it('uses safe array fallbacks for academic-support configuration and requests', () => {
    let categories = -1;
    let requests = -1;
    api.supportConfiguration().subscribe((config) => (categories = config.categories.length));
    http.expectOne(`${baseUrl}/parent/academic-support/configuration`).flush({ data: null });
    api.supportRequests().subscribe((page) => (requests = page.items.length));
    http.expectOne(`${baseUrl}/parent/academic-support/requests`).flush({ data: {} });
    expect(categories).toBe(0);
    expect(requests).toBe(0);
  });

  it('loads character qualities and the selected child quarter from the published endpoints', () => {
    api.characterQualities().subscribe((qualities) => expect(qualities[0].name).toBe('Love'));
    http.expectOne(`${baseUrl}/parent/character/qualities`).flush({
      data: [{ id: 'love', name: 'Love', description: 'Choose the good of another.' }],
    });

    api.characterSelection('child/a').subscribe((selection) => expect(selection.version).toBe(2));
    http.expectOne(`${baseUrl}/parent/character/selection?childId=child%2Fa`).flush({
      data: { childId: 'child/a', quarterId: 'q1', qualityIds: ['love'], version: 2, updatedAt: null },
    });
  });

  it('saves character selection with optimistic-locking data', () => {
    const body = { childId: 'child-1', quarterId: 'q1', qualityIds: ['love', 'joy', 'peace'], expectedVersion: 4 };
    api.saveCharacterSelection(body).subscribe();
    const request = http.expectOne(`${baseUrl}/parent/character/selection`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ data: { ...body, version: 5, updatedAt: '2026-08-24T00:00:00Z' } });
  });

  it('posts numeric child credentials without placing the PIN in the URL', () => {
    api.setChildCredentials('child/a', { handle: 'amalee', pin: '1234' }).subscribe();
    const request = http.expectOne(`${baseUrl}/parent/children/child%2Fa/credentials`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ handle: 'amalee', pin: '1234' });
    request.flush({ data: { success: true, handle: 'amalee' } });
  });
});

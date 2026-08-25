import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ParentCharacterApi } from './parent-character-api.service';

describe('ParentCharacterApi', () => {
  let api: ParentCharacterApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ParentCharacterApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads qualities from the data envelope', () => {
    let names: readonly string[] = [];
    api.getQualities().subscribe((qualities) => (names = qualities.map((quality) => quality.name)));

    http.expectOne('/api/v1/parent/character/qualities').flush({
      data: [{ id: 'kindness', name: 'Kindness', category: 'Relationships' }],
    });
    expect(names).toEqual(['Kindness']);
  });

  it('scopes selection reads to the child and optional quarter', () => {
    api.getSelection('child-1', 'quarter-1').subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === '/api/v1/parent/character/selection' && candidate.params.has('quarterId'),
    );
    expect(request.request.params.get('childId')).toBe('child-1');
    expect(request.request.params.get('quarterId')).toBe('quarter-1');
    request.flush({ data: { childId: 'child-1', selectedQualities: [], version: 1 } });
  });

  it('sends the optimistic-concurrency version when saving', () => {
    const payload = { childId: 'child-1', qualityIds: ['kindness', 'joy', 'patience'], expectedVersion: 4 };
    let savedVersion = 0;
    api.saveSelection(payload).subscribe((selection) => (savedVersion = selection.version));

    const request = http.expectOne('/api/v1/parent/character/selection');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ data: { childId: 'child-1', selectedQualities: payload.qualityIds, version: 5 } });
    expect(savedVersion).toBe(5);
  });
});

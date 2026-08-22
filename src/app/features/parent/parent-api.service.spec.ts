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

  it('omits empty child and cursor values from the observations request URL', () => {
    api.observations().subscribe();
    http.expectOne(`${baseUrl}/parent/observations`).flush({ data: { items: [], hasMore: false } });
  });

  it('omits an empty cursor from the academic-support request URL and accepts an empty 200 list', () => {
    let itemCount = -1;
    api.supportRequests().subscribe((page) => (itemCount = page.items.length));
    http
      .expectOne(`${baseUrl}/parent/academic-support/requests`)
      .flush({ data: { items: [], hasMore: false } }, { headers: { 'Cache-Control': 'no-store' } });
    expect(itemCount).toBe(0);
  });
});

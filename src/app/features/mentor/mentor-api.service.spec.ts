import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MentorApi } from './mentor-api.service';

describe('MentorApi', () => {
  let api: MentorApi;
  let http: HttpTestingController;
  const baseUrl = environment.apiUrl.replace(/\/$/, '');
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(MentorApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('requests only the assigned mentor team endpoint', () => {
    api.teams().subscribe();
    http.expectOne(`${baseUrl}/mentor/teams`).flush({ data: [] });
  });
  it('encodes opaque resource ids and sends only guidance', () => {
    api.addGuidance('review/one', 'Keep going').subscribe();
    const request = http.expectOne(`${baseUrl}/mentor/projects/review%2Fone/guidance`);
    expect(request.request.body).toEqual({ guidance: 'Keep going' });
    request.flush({ data: {} });
  });
});

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
  it('encodes review and milestone ids and sends only milestone feedback', () => {
    api.addMilestoneFeedback('review/one', 'milestone/two', 'A useful next step').subscribe();
    const request = http.expectOne(`${baseUrl}/mentor/projects/review%2Fone/milestones/milestone%2Ftwo/feedback`);
    expect(request.request.body).toEqual({ feedback: 'A useful next step' });
    request.flush({ data: {} });
  });
  it('updates follow-up status using an encoded opaque notification id', () => {
    api.updateNotificationFollowUp('notice/one', 'completed').subscribe();
    const request = http.expectOne(`${baseUrl}/mentor/notifications/notice%2Fone/follow-up`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ followUpStatus: 'completed' });
    request.flush({ data: {} });
  });
});

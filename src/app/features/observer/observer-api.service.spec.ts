import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ObserverApi } from './observer-api.service';

describe('ObserverApi', () => {
  let api: ObserverApi;
  let http: HttpTestingController;
  const baseUrl = environment.apiUrl.replace(/\/$/, '');
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ObserverApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads the backend grant list without a participant-search parameter', () => {
    api.grants().subscribe();
    http.expectOne(`${baseUrl}/observer/grants`).flush({ data: [] });
  });
  it('loads only the signed-in observer submission history', () => {
    api.observations().subscribe();
    http.expectOne(`${baseUrl}/observer/observations`).flush({ data: [] });
  });
});

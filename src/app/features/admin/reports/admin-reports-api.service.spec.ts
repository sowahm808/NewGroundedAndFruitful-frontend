import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AdminReportsApiService } from './admin-reports-api.service';

describe('AdminReportsApiService', () => {
  let service: AdminReportsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminReportsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists report jobs without the universal pagination or sort query', () => {
    service.list().subscribe((page) => expect(page.items).toEqual([]));
    const request = http.expectOne(`${environment.apiUrl}/admin/reports`);
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ data: { items: [] } });
  });

  it('uses exactly one caller-provided idempotency key when creating a report', () => {
    service.create({ reportType: 'quarter_progress', quarterId: 'q-1' }, 'report-key').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/admin/reports`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.getAll('Idempotency-Key')).toEqual(['report-key']);
    request.flush({ data: { id: 'job-1' } });
  });
});

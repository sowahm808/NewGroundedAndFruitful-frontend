import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthTokenProvider } from '../../../core/auth/auth-token-provider.service';
import { ApiClient } from '../../../core/http/api-client.service';
import { ApiError } from '../../../core/http/api-error';
import { AdminTeamsApiService } from './admin-teams-api.service';

describe('AdminTeamsApiService', () => {
  let service: AdminTeamsApiService;
  let api: jasmine.SpyObj<ApiClient>;
  let token: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiClient>('ApiClient', ['getData', 'postData']);
    token = jasmine.createSpy('token').and.resolveTo('fresh-token');
    TestBed.configureTestingModule({
      providers: [
        AdminTeamsApiService,
        { provide: ApiClient, useValue: api },
        { provide: AuthTokenProvider, useValue: { token } },
      ],
    });
    service = TestBed.inject(AdminTeamsApiService);
  });

  it('uses the central API client team path', () => {
    api.getData.and.returnValue(of({ items: [] }));
    service.list().subscribe();
    expect(api.getData).toHaveBeenCalledOnceWith('/admin/teams');
  });

  it('forces one token refresh and retries once after a 401', () => {
    api.postData.and.returnValues(
      throwError(() => new ApiError(401, 'authentication_required', 'expired')),
      of({ id: 'team-1' }),
    );
    service
      .create({ name: 'Jesus team', capacity: 5, targetPoints: 5000, organizationId: 'organization-1' })
      .subscribe();
    expect(token).toHaveBeenCalledOnceWith(true);
    expect(api.postData).toHaveBeenCalledTimes(2);
  });

  it('does not retry a second 401', (done) => {
    api.getData.and.returnValue(throwError(() => new ApiError(401, 'authentication_required', 'expired')));
    service.list().subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
        expect(token).toHaveBeenCalledTimes(1);
        expect(api.getData).toHaveBeenCalledTimes(2);
        done();
      },
    });
  });

  it('does not refresh or retry a 403', (done) => {
    api.getData.and.returnValue(throwError(() => new ApiError(403, 'relationship_forbidden', 'forbidden')));
    service.list().subscribe({
      error: () => {
        expect(token).not.toHaveBeenCalled();
        expect(api.getData).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { roleGuard } from './auth.guards';
describe('roleGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('allows only a verified session role', () => {
    const auth = TestBed.inject(AuthService);
    auth.restore({ uid: '1', displayName: 'Parent', roles: ['parent'], disabled: false });
    expect(TestBed.runInInjectionContext(() => roleGuard(['parent'])({} as never, {} as never))).toBeTrue();
    expect(TestBed.runInInjectionContext(() => roleGuard(['admin'])({} as never, {} as never))).toEqual(
      TestBed.inject(Router).createUrlTree(['/unauthorized']),
    );
  });
});

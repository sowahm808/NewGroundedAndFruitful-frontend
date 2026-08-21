import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GlobalErrorHandler } from './global-error-handler';
import { ApiError } from '../http/api-error';

describe('GlobalErrorHandler', () => {
  it('logs genuine programming exceptions with the current Router URL', () => {
    const consoleError = spyOn(console, 'error');
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        {
          provide: Router,
          useValue: {
            url: '/admin/bible',
            currentNavigation: () => ({
              id: 123,
              previousNavigation: { finalUrl: { toString: () => '/admin/quarters' } },
            }),
            lastSuccessfulNavigation: () => ({ id: 122 }),
          },
        },
        { provide: DOCUMENT, useValue: document },
      ],
    });

    TestBed.inject(GlobalErrorHandler).handleError(new TypeError('component invariant failed'));

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.calls.mostRecent().args[0]).toBe('An unexpected application error occurred.');
    expect(consoleError.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({
        angularErrorCode: null,
        currentRoute: '/admin/bible',
        originRoute: '/admin/quarters',
        navigationId: 123,
      }),
    );
  });

  it('reports the same programming failure only once', () => {
    const consoleError = spyOn(console, 'error');
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        {
          provide: Router,
          useValue: { url: '/admin/bible', currentNavigation: () => null, lastSuccessfulNavigation: () => ({ id: 9 }) },
        },
        { provide: DOCUMENT, useValue: document },
      ],
    });
    const handler = TestBed.inject(GlobalErrorHandler);
    const failure = new TypeError('broken invariant');
    handler.handleError(failure);
    handler.handleError(failure);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('does not report a normalized handled HTTP failure', () => {
    const consoleError = spyOn(console, 'error');
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        {
          provide: Router,
          useValue: { url: '/admin/bible', currentNavigation: () => null, lastSuccessfulNavigation: () => null },
        },
        { provide: DOCUMENT, useValue: document },
      ],
    });
    TestBed.inject(GlobalErrorHandler).handleError(new ApiError(403, 'relationship_forbidden', 'Forbidden'));
    expect(consoleError).not.toHaveBeenCalled();
  });
});

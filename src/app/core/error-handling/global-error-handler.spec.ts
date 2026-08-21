import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('logs genuine programming exceptions with the current Router URL', () => {
    const consoleError = spyOn(console, 'error');
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: Router, useValue: { url: '/admin/bible/imports/new' } },
        { provide: DOCUMENT, useValue: document },
      ],
    });

    TestBed.inject(GlobalErrorHandler).handleError(new TypeError('component invariant failed'));

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.calls.mostRecent().args[0]).toBe('An unexpected application error occurred.');
    expect(consoleError.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ angularErrorCode: null, route: '/admin/bible/imports/new' }),
    );
  });
});

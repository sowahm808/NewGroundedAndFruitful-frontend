import { ErrorHandler, Injectable } from '@angular/core';
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error(
      'An unexpected application error occurred.',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

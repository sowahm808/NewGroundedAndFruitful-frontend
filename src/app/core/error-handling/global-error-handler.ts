import { DOCUMENT } from '@angular/common';
import { ErrorHandler, Injectable, inject } from '@angular/core';

interface SafeErrorDiagnostics {
  readonly angularErrorCode: string | null;
  readonly route: string;
  readonly applicationVersion: string;
  readonly buildSha: string;
  readonly correlationId: string;
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly document = inject(DOCUMENT);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const diagnostics: SafeErrorDiagnostics = {
      angularErrorCode: /\bNG\d{4}\b/.exec(message)?.[0] ?? null,
      route: this.document.defaultView?.location.pathname ?? '/',
      applicationVersion: this.meta('application-version'),
      buildSha: this.meta('build-sha'),
      correlationId: globalThis.crypto?.randomUUID?.() ?? `error-${Date.now()}`,
    };
    console.error('An unexpected application error occurred.', diagnostics);
  }

  private meta(name: string): string {
    return this.document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || 'unknown';
  }
}

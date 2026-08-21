import { DOCUMENT } from '@angular/common';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../http/api-error';

interface SafeErrorDiagnostics {
  readonly angularErrorCode: string | null;
  readonly currentRoute: string;
  readonly originRoute: string | null;
  readonly navigationId: number | null;
  readonly applicationVersion: string;
  readonly buildSha: string;
  readonly correlationId: string;
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly reportedObjects = new WeakSet<object>();

  handleError(error: unknown): void {
    // Request failures belong to the API/page outcome path, never the uncaught runtime path.
    if (error instanceof ApiError) return;
    if (typeof error === 'object' && error !== null) {
      if (this.reportedObjects.has(error)) return;
      this.reportedObjects.add(error);
    }
    const message = error instanceof Error ? error.message : String(error);
    const currentRoute = this.router.url || this.document.defaultView?.location.pathname || '/';
    const navigation = this.router.currentNavigation();
    const originRoute = navigation?.previousNavigation?.finalUrl?.toString() ?? null;
    const navigationId = navigation?.id ?? this.router.lastSuccessfulNavigation()?.id ?? null;
    const diagnostics: SafeErrorDiagnostics = {
      angularErrorCode: /\bNG\d{4}\b/.exec(message)?.[0] ?? null,
      // Router.url reflects the active Angular navigation, including redirects, at failure time.
      currentRoute,
      originRoute,
      navigationId,
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

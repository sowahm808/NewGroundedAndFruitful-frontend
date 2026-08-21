import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { GfAlert, GfButton, GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfAlert, GfButton, GfPageHeader],
  template: `<main>
    <gf-page-header title="Set up your personal workspace" eyebrow="Account setup">
      <p>Your private workspace keeps your family’s growth journey together.</p></gf-page-header
    >
    @if (error()) {
      <gf-alert title="Personal workspace is not ready"
        ><p>{{ error() }}</p></gf-alert
      >
    }
    <gf-button [disabled]="busy()" (pressed)="retry()">{{ busy() ? 'Checking…' : 'Check setup again' }}</gf-button>
  </main>`,
  styles: [
    `
      main {
        max-width: 40rem;
        margin: 3rem auto;
        padding: 1.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalOnboardingComponent {
  private readonly auth = inject(AuthService);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  async retry(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const session = await this.auth.retrySession();
      if (!session) throw new Error();
      const target = this.coordinator.resolvePostAuthenticationRoute(session, this.router.url);
      if (target) await this.router.navigateByUrl(target);
    } catch {
      this.error.set('We could not load your personal workspace. Please retry.');
    } finally {
      this.busy.set(false);
    }
  }
}

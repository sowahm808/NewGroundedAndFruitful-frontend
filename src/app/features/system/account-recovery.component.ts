import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfPageHeader],
  template: `<gf-page-header title="Account recovery" eyebrow="Account status">
    <p>We found your sign-in, but we could not safely determine its workspace setup.</p>
    @if (supportReference()) {
      <p>
        Support reference: <strong>{{ supportReference() }}</strong>
      </p>
    }
    <p>Please include this reference when contacting Grounded &amp; Fruitful support.</p>
    <div class="actions">
      <button type="button" [disabled]="busy()" (click)="retry()">{{ retrying() ? 'Retrying…' : 'Retry' }}</button>
      <button type="button" [disabled]="busy()" (click)="signOut()">
        {{ signingOut() ? 'Signing out…' : 'Sign out' }}
      </button>
    </div>
  </gf-page-header>`,
  styles: [
    `
      .actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRecoveryComponent {
  private readonly auth = inject(AuthService);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  private readonly router = inject(Router);
  readonly retrying = signal(false);
  readonly signingOut = signal(false);
  readonly busy = () => this.retrying() || this.signingOut();
  readonly supportReference = () => this.auth.user()?.supportReference;

  async retry(): Promise<void> {
    if (this.busy()) return;
    this.retrying.set(true);
    try {
      const session = await this.auth.retrySession();
      if (session) {
        const target = this.coordinator.decision(session).path;
        if (target !== this.router.url) await this.router.navigateByUrl(target);
      }
    } finally {
      this.retrying.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (this.busy()) return;
    this.signingOut.set(true);
    await this.auth.logout();
  }
}

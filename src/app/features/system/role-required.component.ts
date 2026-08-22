import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfPageHeader],
  template: `<gf-page-header title="Your organization access is pending" eyebrow="Account status"
    ><p>Your account is active, but an organization administrator still needs to assign your program access.</p>
    <button type="button" [disabled]="checking() || signingOut()" (click)="checkAgain()">
      {{ checking() ? 'Checking…' : 'Check again' }}
    </button>
    <button type="button" [disabled]="checking() || signingOut()" (click)="signOut()">
      {{ signingOut() ? 'Signing out…' : 'Sign out' }}
    </button></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleRequiredComponent {
  private readonly auth = inject(AuthService);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  private readonly router = inject(Router);
  readonly signingOut = signal(false);
  readonly checking = signal(false);

  async checkAgain(): Promise<void> {
    if (this.checking() || this.signingOut()) return;
    this.checking.set(true);
    try {
      const session = await this.auth.retrySession();
      if (session) {
        const target = this.coordinator.decision(session).path;
        if (target !== this.router.url) await this.router.navigateByUrl(target);
      }
    } finally {
      this.checking.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    await this.auth.logout();
  }
}

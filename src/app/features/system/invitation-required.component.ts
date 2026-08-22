import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfPageHeader],
  template: `<gf-page-header title="Accept your invitation" eyebrow="Account setup">
    <p>Your verified sign-in has an invitation ready for secure acceptance.</p>
    <p>Continue through the invitation link you received. Invitation details are not exposed in this session.</p>
    <button type="button" [disabled]="checking()" (click)="checkAgain()">
      {{ checking() ? 'Checking…' : 'Check again' }}
    </button>
    <button type="button" [disabled]="checking()" (click)="signOut()">Sign out</button>
  </gf-page-header>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationRequiredComponent {
  private readonly auth = inject(AuthService);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  private readonly router = inject(Router);
  readonly checking = signal(false);

  async checkAgain(): Promise<void> {
    if (this.checking()) return;
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
    await this.auth.logout();
  }
}

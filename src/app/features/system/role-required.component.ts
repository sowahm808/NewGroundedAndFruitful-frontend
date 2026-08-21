import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfPageHeader],
  template: `<gf-page-header title="Your account needs more information" eyebrow="Account status"
    ><p>
      You are signed in, but your account does not yet have a role or workspace. If you expected an invitation or
      workspace assignment, contact your organization administrator.
    </p>
    <button type="button" [disabled]="signingOut()" (click)="signOut()">
      {{ signingOut() ? 'Signing out…' : 'Sign out safely' }}
    </button></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleRequiredComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly signingOut = signal(false);

  async signOut(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    await this.auth.logout();
    await this.router.navigateByUrl('/auth/login');
  }
}

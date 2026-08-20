import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfPageHeader],
  template: `<gf-page-header title="Session unavailable" eyebrow="Account status"
    ><p>Your session could not be established safely. Sign in again to retry.</p>
    <a routerLink="/auth/login">Return to sign in</a></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionErrorComponent {}

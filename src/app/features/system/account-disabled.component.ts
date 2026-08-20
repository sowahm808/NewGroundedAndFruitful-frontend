import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfPageHeader],
  template: `<gf-page-header title="Account unavailable" eyebrow="Account status"
    ><p>This account is disabled or suspended. Contact an administrator for help.</p>
    <a routerLink="/auth/login">Return to sign in</a></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDisabledComponent {}

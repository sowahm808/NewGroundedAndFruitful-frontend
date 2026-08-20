import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfPageHeader],
  template: `<gf-page-header title="Your account needs a role" eyebrow="Account status"
    ><p>An administrator must assign your program role before you can continue.</p>
    <a routerLink="/auth/login">Return to sign in</a></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleRequiredComponent {}

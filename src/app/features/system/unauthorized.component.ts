import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfPageHeader],
  template: `<gf-page-header title="You do not have access" eyebrow="Account status"
    ><p>Your signed-in role does not permit this page.</p>
    <a routerLink="/account/profile">Return to your profile</a></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedComponent {}

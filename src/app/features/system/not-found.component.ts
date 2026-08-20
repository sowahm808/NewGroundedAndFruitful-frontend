import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfPageHeader],
  template: `<gf-page-header title="Page not found" eyebrow="Account status"
    ><p>The requested address does not match a page in Grounded & Fruitful.</p>
    <a routerLink="/auth/login">Go to sign in</a></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}

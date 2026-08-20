import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfPageHeader],
  template: `<gf-page-header title="Approval pending" eyebrow="Account status"
    ><p>Your program membership is still awaiting administrator approval.</p>
    <a routerLink="/auth/login">Return to sign in</a></gf-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalPendingComponent {}

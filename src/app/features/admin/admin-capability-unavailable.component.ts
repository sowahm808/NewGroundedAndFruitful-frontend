import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GfAlert, GfPageHeader } from '../../shared/components/design-system';

/** Safe route target for admin capabilities that have no documented backend contract. */
@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfPageHeader],
  template: `
    <gf-page-header [title]="title + ' administration'" eyebrow="Unavailable">
      <p>This feature is not currently available.</p>
    </gf-page-header>
    <gf-alert title="Feature unavailable">
      <p>No records or controls are shown until this capability is supported.</p>
      <a routerLink="/admin/quarters">Return to quarters</a>
    </gf-alert>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCapabilityUnavailableComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string;
}

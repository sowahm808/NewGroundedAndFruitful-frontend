import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfAlert, GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfPageHeader],
  template: `
    <gf-page-header title="Reports administration" eyebrow="Unavailable">
      <p>
        This operation is not available because the backend does not publish an authorized reports administration
        capability.
      </p>
    </gf-page-header>
    <gf-alert title="Capability not published">
      <p>No records or controls are shown until this capability is supported.</p>
      <a routerLink="/admin/quarters">Return to quarters</a>
    </gf-alert>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReportsUnavailableComponent {}

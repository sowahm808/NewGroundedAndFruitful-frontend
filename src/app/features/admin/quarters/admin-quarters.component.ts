import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GfAlert, GfPageHeader } from '../../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfAlert, GfPageHeader],
  template: `
    <gf-page-header title="Quarters" eyebrow="Administration">
      <p>Configure program quarters after the administration contract is published.</p>
    </gf-page-header>
    <gf-alert title="Backend contract required">
      Quarter records cannot be loaded safely because the backend does not publish a verifiable OpenAPI contract for
      <code>GET /admin/quarters</code>. Create, edit, and lifecycle actions remain disabled rather than displaying
      invented records or sending unverified request fields.
    </gf-alert>
  `,
  styles: [`:host { display: block; max-width: 72rem; } code { overflow-wrap: anywhere; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQuartersComponent {}

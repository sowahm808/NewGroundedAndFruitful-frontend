import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GfAlert, GfPageHeader } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [GfAlert, GfPageHeader],
  template: `<gf-page-header [title]="title" [eyebrow]="eyebrow"
      ><p>{{ message }}</p></gf-page-header
    ><gf-alert title="Backend integration pending"
      ><p>
        This workflow cannot be connected until its authorized backend contract is published. No example or substitute
        records are shown.
      </p></gf-alert
    >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnavailablePageComponent {
  private route = inject(ActivatedRoute);
  readonly title = String(this.route.snapshot.data['title'] ?? 'Unavailable');
  readonly eyebrow = String(this.route.snapshot.data['eyebrow'] ?? 'Grounded & Fruitful');
  readonly message = String(this.route.snapshot.data['message'] ?? 'The required backend workflow has not been published.');
}

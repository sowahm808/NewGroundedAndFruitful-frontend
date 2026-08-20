import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfAlert, GfPageHeader } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Bible activity" eyebrow="Learn and reflect">
      <p>Participation is rewarded for completing an activity—not for answering correctly.</p>
    </gf-page-header>
    <gf-alert title="Bible activity is not available yet">
      <p>
        This is a configuration dependency, not a day without an assigned activity. The secure Bible activity contract
        has not been published, so no quiz or fallback answers are loaded into your browser.
      </p>
      <a routerLink="/child/today">Return to today</a>
    </gf-alert>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BibleComponent {}

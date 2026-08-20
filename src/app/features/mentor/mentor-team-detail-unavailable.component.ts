import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GfAlert, GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfPageHeader],
  template: `
    <gf-page-header title="Mentor team details" eyebrow="Unavailable">
      <p>
        This operation is not available because the backend does not publish an authorized mentor team-detail
        capability.
      </p>
    </gf-page-header>
    <gf-alert title="Feature unavailable">
      <p>No records or controls are shown until this capability is supported.</p>
      <a routerLink="/account/profile">Return to your profile</a>
    </gf-alert>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorTeamDetailUnavailableComponent {}

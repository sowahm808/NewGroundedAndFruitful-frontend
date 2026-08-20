import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  GfAlert,
  GfCard,
  GfEmptyState,
  GfLoading,
  GfPageHeader,
  GfProgress,
} from '../../shared/components/design-system';
import { MentorApi, MentorTeamSummary } from './mentor-api.service';
import { MentorViewError, mentorViewError } from './mentor-view.utilities';

@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader, GfProgress],
  template: `<gf-page-header title="My teams" eyebrow="Mentor"
      ><p>Teams assigned to you by the program.</p></gf-page-header
    >
    @if (error(); as e) {
      <gf-alert title="Teams unavailable"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
      </gf-alert>
    }
    @if (loading()) {
      <gf-loading />
    } @else if (!teams().length) {
      <gf-empty-state title="No assigned teams" message="Your program coordinator will assign teams here." />
    }
    <div class="cards">
      @for (team of teams(); track team.id) {
        <gf-card
          ><h2>{{ team.name }}</h2>
          <p>{{ team.quarter }} · {{ team.participantCount }} participants</p>
          <p><strong>Participation:</strong> {{ team.participationStatus }}</p>
          <gf-progress label="Composite team progress" [value]="team.progress.percent" />
          <p>{{ team.progress.completed }} of {{ team.progress.target }}</p>
          <a [routerLink]="['/mentor/teams', team.id]">View team details</a></gf-card
        >
      }
    </div>`,
  styleUrl: './mentor-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorTeamsComponent {
  private readonly api = inject(MentorApi);
  private readonly destroy = inject(DestroyRef);
  readonly teams = signal<readonly MentorTeamSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<MentorViewError | null>(null);
  constructor() {
    this.api
      .teams()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.teams.set(v);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.loading.set(false);
        },
      });
  }
}

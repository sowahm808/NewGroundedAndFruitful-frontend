import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfLoading, GfPageHeader, GfProgress } from '../../shared/components/design-system';
import { MentorApi, MentorTeamDetail } from './mentor-api.service';
import { MentorViewError, mentorViewError } from './mentor-view.utilities';
@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfCard, GfLoading, GfPageHeader, GfProgress],
  template: `<a routerLink="/mentor/teams">← All teams</a>
    @if (loading()) {
      <gf-loading />
    } @else if (team(); as t) {
      <gf-page-header [title]="t.name" [eyebrow]="t.quarter"
        ><p>Approved program summaries only. Private check-in information is never included.</p></gf-page-header
      ><gf-card
        ><p><strong>Participation:</strong> {{ t.participationStatus }}</p>
        <gf-progress label="Composite team progress" [value]="t.progress.percent" />
        <p class="meta">Calculated {{ t.calculatedAt }}</p></gf-card
      >
      <h2>Participants</h2>
      <div class="cards">
        @for (p of t.participants; track p.id) {
          <gf-card
            ><h3>{{ p.displayName }}</h3>
            <p><strong>Participation:</strong> {{ p.participationStatus }}</p>
            <p><strong>Reading:</strong> {{ p.readingSummary }}</p>
            <p><strong>Project:</strong> {{ p.projectSummary }}</p></gf-card
          >
        }
      </div>
      <h2>Approved notes</h2>
      <div class="cards">
        @for (n of t.approvedNotes; track n.id) {
          <gf-card
            ><p>{{ n.body }}</p>
            <p class="meta">Approved {{ n.approvedAt }}</p></gf-card
          >
        } @empty {
          <p>No approved notes.</p>
        }
      </div>
    }
    @if (error(); as e) {
      <gf-alert title="Team unavailable"
        ><p>{{ e.message }}</p></gf-alert
      >
    }`,
  styleUrl: './mentor-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorTeamDetailComponent {
  private api = inject(MentorApi);
  private route = inject(ActivatedRoute);
  private destroy = inject(DestroyRef);
  readonly team = signal<MentorTeamDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<MentorViewError | null>(null);
  constructor() {
    this.api
      .team(this.route.snapshot.paramMap.get('teamId') ?? '')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.team.set(v);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.loading.set(false);
        },
      });
  }
}

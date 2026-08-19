import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfCard, GfPageHeader, GfProgress, GfStatCard } from '../../shared/components/design-system';
import { ChildApi, TeamView } from './child-api.service';
@Component({
  standalone: true,
  imports: [GfAlert, GfCard, GfPageHeader, GfProgress, GfStatCard],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Team progress" eyebrow="Together"
      ><p>
        This view uses only the server's composite progress and your own contribution. Private answers and other
        children's contributions are never shown.
      </p></gf-page-header
    >
    @if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (loading()) {
      <p role="status">Loading composite team progress…</p>
    } @else if (data(); as d) {
      <div class="grid">
        <gf-stat-card label="Team" [value]="d.name" /><gf-stat-card label="Quarter" [value]="d.quarter" /><gf-stat-card
          label="Your contribution"
          [value]="d.ownContribution"
        />
      </div>
      <gf-card
        ><gf-progress
          [value]="d.progressPercent"
          [label]="'Composite progress: ' + d.compositePoints + ' of ' + d.target"
        />
        <p class="muted">
          Last calculated by the server: <time [attr.datetime]="d.calculatedAt">{{ d.calculatedAt }}</time>
        </p></gf-card
      >
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamComponent implements OnInit {
  private api = inject(ChildApi);
  readonly data = signal<TeamView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.team().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Team progress could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}

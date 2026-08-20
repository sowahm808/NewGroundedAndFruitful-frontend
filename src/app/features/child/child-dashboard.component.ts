import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/http/api-error';
import {
  GfAlert,
  GfCard,
  GfEmptyState,
  GfPageHeader,
  GfProgress,
  GfStatCard,
} from '../../shared/components/design-system';
import { ChildApi, TodaySummary } from './child-api.service';
@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfCard, GfEmptyState, GfPageHeader, GfProgress, GfStatCard],
  styleUrl: './child-feature.scss',
  template: `
    <gf-page-header title="Today" eyebrow="Child journey"><p>Your private answers stay private.</p></gf-page-header>
    @if (loading()) {
      <div class="grid" role="status" aria-label="Loading today's journey">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="skeleton"></div>
        }
      </div>
    } @else if (error()) {
      <gf-alert [title]="error()!"><button type="button" (click)="load()">Try again</button></gf-alert>
    } @else if (data(); as d) {
      @if (!d.quarter) {
        <gf-empty-state
          title="No active quarter"
          message="There is no active quarter right now. Check back when your program team opens one."
        />
      } @else {
        <div class="grid">
          <gf-stat-card label="Date" [value]="d.quarter.localDate" /><gf-stat-card
            label="Quarter"
            [value]="quarterLabel(d)"
          /><gf-stat-card label="Week" [value]="d.quarter.week + ' of ' + d.quarter.totalWeeks" /><gf-stat-card
            label="Your quarter contribution"
            [value]="d.individualContribution"
          />
        </div>
        <nav class="journey-stepper" aria-label="Today's journey progress">
          <ol>
            @for (item of dailySteps; track item.key; let index = $index) {
              <li [class.complete]="d.activities[item.key] === 'completed'">
                <span class="step-number" aria-hidden="true">{{ index + 1 }}</span>
                <a [routerLink]="item.link">
                  {{ item.label }}
                  <span class="sr-only">— {{ statusLabel(d.activities[item.key]) }}</span>
                </a>
              </li>
            }
          </ol>
        </nav>
        <a class="primary-action" [routerLink]="primaryAction(d).link">{{ primaryAction(d).label }}</a>
        <h2>Today's activities</h2>
        <div class="grid">
          @for (item of activityLinks; track item.key) {
            <gf-card
              ><h3>{{ item.label }}</h3>
              <p>{{ d.activities[item.key].replace('_', ' ') }}</p>
              <a [routerLink]="item.link">Open {{ item.label }}</a></gf-card
            >
          }
        </div>
        <h2>Team progress</h2>
        <gf-card
          ><p>
            <strong>{{ d.team.name }}</strong>
          </p>
          <gf-progress
            [value]="d.team.progressPercent"
            [label]="'Composite team progress: ' + d.team.compositePoints + ' of ' + d.team.target"
          />
          <p class="muted">
            Last calculated by the server: <time [attr.datetime]="d.calculatedAt">{{ d.calculatedAt }}</time>
          </p></gf-card
        >
        <h2>Recognition</h2>
        <gf-card>
          <p>{{ d.recognition?.count ?? 0 }} approved {{ d.recognition?.count === 1 ? 'recognition' : 'recognitions' }}</p>
          @if (d.recognition?.latestLabel; as latestLabel) { <p>Latest: <strong>{{ latestLabel }}</strong></p> }
        </gf-card>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDashboardComponent implements OnInit {
  private api = inject(ChildApi);
  readonly loading = signal(true);
  readonly data = signal<TodaySummary | null>(null);
  readonly error = signal<string | null>(null);
  readonly activityLinks = [
    { key: 'checkIn', label: 'Check-in', link: '/child/check-in' },
    { key: 'gratitude', label: 'Gratitude', link: '/child/gratitude' },
    { key: 'character', label: 'Character', link: '/child/character' },
    { key: 'bible', label: 'Bible', link: '/child/bible' },
    { key: 'reading', label: 'Reading', link: '/child/reading' },
    { key: 'project', label: 'Project', link: '/child/project' },
  ] as const;
  readonly dailySteps = this.activityLinks.slice(0, 4);
  statusLabel(status: string) {
    return status.replace('_', ' ');
  }
  quarterLabel(d: TodaySummary): string {
    const quarter = d.quarter!;
    return quarter.startsOn && quarter.endsOn ? `${quarter.name} · ${quarter.startsOn}–${quarter.endsOn}` : quarter.name;
  }
  primaryAction(d: TodaySummary): { readonly label: string; readonly link: string } {
    const completed = this.dailySteps.filter((step) => d.activities[step.key] === 'completed').length;
    if (completed === this.dailySteps.length) return { label: 'Review completed day', link: '/child/check-in' };
    const next = this.dailySteps.find((step) => d.activities[step.key] !== 'completed')!;
    return { label: completed === 0 ? 'Start today' : 'Continue', link: next.link };
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.today().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(
          e instanceof ApiError && e.code === 'relationship_forbidden'
            ? 'You do not have permission to view this journey.'
            : e instanceof ApiError
              ? e.message
              : 'Today could not be loaded.',
        );
        this.loading.set(false);
      },
    });
  }
}

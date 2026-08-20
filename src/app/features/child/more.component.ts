import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfCard, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { Award, ChildApi, newIdempotencyKey, PointEntry, SpecialActivity, SurveySummary } from './child-api.service';
@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfCard, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Activities and recognition" eyebrow="Your private journey"
      ><p>Points and recognition come from backend-owned calculations. There are no rankings.</p></gf-page-header
    >
    @if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (loading()) {
      <p role="status">Loading activities and recognition…</p>
    } @else {
      <h2>Special activities</h2>
      @if (!special().length) {
        <gf-empty-state title="No special activities" message="No special activities are available right now." />
      } @else {
        <div class="grid">
          @for (a of special(); track a.id) {
            <gf-card
              ><h3>{{ a.title }}</h3>
              <p>{{ a.instructions }}</p>
              <p>Status: {{ a.status }}</p>
              <button [disabled]="!a.eligible || a.status === 'completed'" (click)="complete(a)">
                Complete activity
              </button></gf-card
            >
          }
        </div>
      }
      <h2>Surveys</h2>
      <p>Your survey answers are private and optional questions can be skipped.</p>
      @if (!surveys().length) {
        <gf-empty-state title="No surveys" message="No surveys are available right now." />
      } @else {
        <ul>
          @for (s of surveys(); track s.id) {
            <li>
              <strong>{{ s.title }}</strong> — {{ s.status }}
              @if (s.status !== 'completed' && s.status !== 'locked') {
                <a [routerLink]="['/child/more/surveys', s.id]">Open survey</a>
              }
            </li>
          }
        </ul>
      }
      <h2>Point history</h2>
      @if (quarterTotals().length) {
        <div class="grid">@for (total of quarterTotals(); track total.quarter) { <gf-card><strong>{{ total.quarter }}</strong><p>{{ total.total }} points</p></gf-card> }</div>
      }
      @if (!points().length) {
        <gf-empty-state title="No point history" message="Backend-calculated entries will appear here." />
      } @else {
        <ul>
          @for (p of points(); track p.id) {
            <li>
              <time [attr.datetime]="p.date">{{ p.date }}</time> — {{ p.sourceLabel }}: {{ p.amount }} points ({{
                p.quarter
              }})
              @if (p.adjustment) {
                <strong>Adjustment</strong>
              }
              @if (p.reversesEntryId) { <span> — reverses entry {{ p.reversesEntryId }}</span> }
              @if (p.adjustedEntryId) { <span> — adjusts entry {{ p.adjustedEntryId }}</span> }
            </li>
          }
        </ul>
        @if (pointsCursor()) { <button class="secondary" type="button" (click)="loadMorePoints()">Load more history</button> }
      }
      <h2>Recognition</h2>
      @if (!awards().length) {
        <gf-empty-state title="No recognition yet" message="Backend-issued recognition will appear here." />
      } @else {
        <div class="grid">
          @for (a of awards(); track a.id) {
            <gf-card
              ><h3>{{ a.name }}</h3>
              <p>{{ a.description }}</p>
              <p>{{ a.quarter }} — {{ a.status }}</p>
              @if (a.issuedDate) {
                <time [attr.datetime]="a.issuedDate">Issued {{ a.issuedDate }}</time>
              }
            </gf-card>
          }
        </div>
      }
    }
    <p role="status" aria-live="polite">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoreComponent implements OnInit {
  private api = inject(ChildApi);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly special = signal<readonly SpecialActivity[]>([]);
  readonly surveys = signal<readonly SurveySummary[]>([]);
  readonly points = signal<readonly PointEntry[]>([]);
  readonly pointsCursor = signal<string | null>(null);
  readonly quarterTotals = signal<readonly { readonly quarter: string; readonly total: number }[]>([]);
  readonly awards = signal<readonly Award[]>([]);
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    forkJoin({
      special: this.api.specialActivities(),
      surveys: this.api.surveys(),
      points: this.api.points(),
      awards: this.api.awards(),
    }).subscribe({
      next: (r) => {
        this.special.set(r.special);
        this.surveys.set(r.surveys);
        this.points.set(r.points.items);
        this.pointsCursor.set(r.points.nextCursor ?? null);
        this.quarterTotals.set(r.points.quarterTotals ?? []);
        this.awards.set(r.awards.items);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Activities and recognition could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  loadMorePoints() {
    const cursor = this.pointsCursor();
    if (!cursor) return;
    this.api.points(cursor).subscribe({
      next: (page) => {
        this.points.update((items) => [...items, ...page.items]);
        this.pointsCursor.set(page.nextCursor ?? null);
      },
      error: (e) => this.message.set(e instanceof ApiError ? e.message : 'More point history could not be loaded.'),
    });
  }
  complete(a: SpecialActivity) {
    this.api.completeSpecialActivity(a.id, newIdempotencyKey()).subscribe({
      next: (x) => {
        this.special.update((all) => all.map((v) => (v.id === x.id ? x : v)));
        this.message.set('Special activity complete. The participation award is calculated by the server.');
      },
      error: (e) => this.message.set(e instanceof ApiError ? e.message : 'The activity could not be completed.'),
    });
  }
}

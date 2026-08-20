import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfPageHeader } from '../../../shared/components/design-system';
import { AdminBibleApiService, BibleContentSet } from './admin-bible-api.service';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, GfAlert, GfBadge, GfPageHeader],
  template: `
    <gf-page-header title="Bible content details" eyebrow="Bible Administration"
      ><p>Review the authoritative content-set record.</p></gf-page-header
    >
    <p><a routerLink="/admin/bible">← Back to Bible content</a></p>
    @if (loading()) {
      <p role="status">Loading Bible content…</p>
    } @else if (error()) {
      <gf-alert title="Bible content could not be loaded"
        ><p>Try again. If the problem continues, contact an administrator.</p>
        <button (click)="load()">Retry</button></gf-alert
      >
    }
    @if (content(); as item) {
      <article>
        <h2>{{ item.title }}</h2>
        <dl>
          <div>
            <dt>Quarter</dt>
            <dd>{{ item.quarterName }}</dd>
          </div>
          <div>
            <dt>Date range</dt>
            <dd>{{ item.startDate }} – {{ item.endDate }}</dd>
          </div>
          <div>
            <dt>Activities</dt>
            <dd>{{ item.activityCount }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <gf-badge>{{ item.status }}</gf-badge>
            </dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{{ item.version }}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{{ item.updatedAt | date: 'medium' }}</dd>
          </div>
        </dl>
      </article>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 58rem;
      }
      article {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }
      dl div {
        display: grid;
        grid-template-columns: 10rem 1fr;
        padding: 0.65rem 0;
        border-bottom: 1px solid var(--border);
      }
      dt {
        font-weight: 800;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleContentComponent {
  private readonly api = inject(AdminBibleApiService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('contentSetId') ?? '';
  readonly content = signal<BibleContentSet | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly loading = signal(true);
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getContent(this.id).subscribe({
      next: (value) => {
        this.content.set(value);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }
}

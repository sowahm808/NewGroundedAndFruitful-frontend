import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfPageHeader } from '../../../shared/components/design-system';
import { AdminBibleApiService, BibleContentSet } from './admin-bible-api.service';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, GfAlert, GfBadge, GfPageHeader],
  template: `
    <gf-page-header title="Bible content details" eyebrow="Bible Administration">
      <p>Review the authoritative content-set record.</p>
    </gf-page-header>

    <p><a routerLink="/admin/bible" [queryParams]="{ tab: 'content' }">← Back to Bible content</a></p>

    @if (loading()) {
      <p role="status">Loading Bible content…</p>
    } @else if (error()) {
      <gf-alert title="Bible content could not be loaded">
        <p>Try again. If the problem continues, contact an administrator.</p>
        <button (click)="load()">Retry</button>
      </gf-alert>
    }

    @if (content(); as item) {
      @if (publishError(); as failure) {
        <gf-alert [title]="publishErrorTitle()" variant="error">
          <p>{{ failure.message }}</p>
          @if (showQuarterLink()) {
            <div style="margin-top: 0.75rem;">
              <a routerLink="/admin/quarters" class="btn-link">Go to Quarters to Activate &rarr;</a>
            </div>
          }
        </gf-alert>
      }

      @if (publishSuccess()) {
        <gf-alert title="Content set published">
          <p>This content set is now available as published content.</p>
        </gf-alert>
      }

      <article>
        <h2>{{ item.title }}</h2>
        <dl>
          <div>
            <dt>Quarter</dt>
            <dd>{{ item.quarterName || '—' }}</dd>
          </div>
          <div>
            <dt>Date range</dt>
            <dd>{{ item.startDate || '—' }} – {{ item.endDate || '—' }}</dd>
          </div>
          <div>
            <dt>Activities</dt>
            <dd>{{ item.activityCount ?? 0 }}</dd>
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
            <dd>{{ item.updatedAt ? (item.updatedAt | date: 'medium') : '—' }}</dd>
          </div>
        </dl>

        <div class="actions-panel">
          @if (item.status === 'draft') {
            <button type="button" class="publish" [disabled]="busy()" (click)="publish()">
              {{ busy() ? 'Publishing…' : 'Publish Content Set' }}
            </button>
          }
          @if (item.status !== 'archived') {
            <button type="button" class="archive" [disabled]="busy()" (click)="archive()">
              {{ busy() ? 'Archiving…' : 'Archive Content Set' }}
            </button>
          }
        </div>
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
      .actions-panel {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .publish {
        background: var(--brand);
        color: #fff;
        font-weight: 700;
        padding: 0.6rem 1.2rem;
        border-radius: var(--radius-md);
        border: 0;
        cursor: pointer;
      }
      .archive {
        background: transparent;
        color: #c00;
        font-weight: 700;
        padding: 0.6rem 1.2rem;
        border-radius: var(--radius-md);
        border: 1px solid #fcc;
        cursor: pointer;
      }
      .btn-link {
        display: inline-block;
        background: var(--brand);
        color: #fff;
        padding: 0.4rem 0.8rem;
        border-radius: var(--radius-sm);
        text-decoration: none;
        font-size: 0.9rem;
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
  readonly busy = signal(false);
  readonly publishError = signal<ApiError | null>(null);
  readonly publishErrorTitle = signal<string>('Publish Failed');
  readonly showQuarterLink = signal(false);
  readonly publishSuccess = signal(false);

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

  publish() {
    const item = this.content();
    if (!item || item.status !== 'draft' || this.busy()) return;

    this.busy.set(true);
    this.publishError.set(null);
    this.showQuarterLink.set(false);
    this.publishSuccess.set(false);

    this.api.publishContent(this.id, item.version).subscribe({
      next: () => {
        this.busy.set(false);
        this.publishSuccess.set(true);
        this.load();
      },
      error: (error: ApiError) => {
        this.publishError.set(error);
        this.busy.set(false);
        if (error.status === 409 && error.message?.toLowerCase().includes('quarter must be active')) {
          this.publishErrorTitle.set('Quarter Inactive');
          this.showQuarterLink.set(true);
        } else {
          this.publishErrorTitle.set('Publish Failed');
        }
      },
    });
  }

  archive() {
    const item = this.content();
    if (!item || this.busy()) return;
    if (!confirm(`Are you sure you want to archive "${item.title}"?`)) return;

    this.busy.set(true);
    this.publishError.set(null);

    this.api.archiveContent(this.id, item.version).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (error: ApiError) => {
        this.publishError.set(error);
        this.busy.set(false);
        this.publishErrorTitle.set('Archive Failed');
      },
    });
  }
}
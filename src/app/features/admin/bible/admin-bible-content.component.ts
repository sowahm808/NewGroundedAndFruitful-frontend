import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
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
      @if (publishError(); as failure) {
        <gf-alert title="Content set could not be published"
          ><p>{{ failure.message }}</p></gf-alert
        >
      }
      @if (publishSuccess()) {
        <gf-alert title="Content set published"
          ><p>This content set is now available as published content.</p></gf-alert
        >
      }
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
        @if (item.status === 'draft') {
          <button type="button" class="publish" [disabled]="publishing()" (click)="publish()">
            {{ publishing() ? 'Publishing…' : 'Publish Content Set' }}
          </button>
        }
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
      .publish {
        margin-top: 1.25rem;
        background: var(--brand);
        color: #fff;
        font-weight: 700;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleContentComponent {
  private readonly api = inject(AdminBibleApiService);
  private readonly http = inject(HttpClient);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('contentSetId') ?? '';
  readonly content = signal<BibleContentSet | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly loading = signal(true);
  readonly publishing = signal(false);
  readonly publishError = signal<ApiError | null>(null);
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
  archiveBibleContent(contentSetId: string, payload: { expectedVersion: number }): Observable<unknown> {
  return this.http.post(`/api/v1/admin/bible-content/${contentSetId}/archive`, payload);
}

publishBibleContent(contentSetId: string, payload: { expectedVersion: number }): Observable<unknown> {
  return this.http.post(`/api/v1/admin/bible-content/${contentSetId}/publish`, payload);
}
  publish() {
    const item = this.content();
    if (!item || item.status !== 'draft' || this.publishing()) return;
    this.publishing.set(true);
    this.publishError.set(null);
    this.publishSuccess.set(false);
    this.api.publishContent(this.id, item.version).subscribe({
      next: () => {
        this.publishing.set(false);
        this.publishSuccess.set(true);
        this.load();
      },
      error: (error: ApiError) => {
        this.publishError.set(error);
        this.publishing.set(false);
      },
    });
  }
}

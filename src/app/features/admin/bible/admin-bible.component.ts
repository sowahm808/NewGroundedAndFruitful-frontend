import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfPageHeader, GfStatCard } from '../../../shared/components/design-system';
import {
  AdminBibleApiService,
  BibleContentList,
  BibleContentQuery,
  BibleContentSet,
  BibleContentSort,
  BibleContentStatus,
  BibleImportList,
} from './admin-bible-api.service';

const PAGE_SIZE = 25;
type LoadResult = { sequence: number; data?: BibleContentList; error?: ApiError };

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, GfAlert, GfBadge, GfPageHeader, GfStatCard],
  template: `
    <div class="header-row">
      <gf-page-header title="Bible Content" eyebrow="Bible Administration">
        <p>Import, review, schedule and publish Bible activities for program quarters.</p>
      </gf-page-header>
      <a class="primary" routerLink="/admin/bible/imports/new">Upload Quiz</a>
    </div>

    <nav class="tabs" aria-label="Bible administration sections">
      <button type="button" [class.active]="tab() === 'imports'" (click)="selectTab('imports')">
        Imports <span class="count">{{ imports()?.aggregates?.needs_review ?? 0 }} needing review</span>
      </button>
      <button type="button" [class.active]="tab() === 'content'" (click)="selectTab('content')">
        Content sets
      </button>
    </nav>

    @if (actionError(); as failure) {
      <gf-alert [title]="actionErrorTitle()" variant="error">
        <p>{{ failure.message }}</p>
        @if (showQuarterLink()) {
          <div style="margin-top: 0.75rem;">
            <a routerLink="/admin/quarters" class="primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">
              Go to Quarters to Activate &rarr;
            </a>
          </div>
        }
      </gf-alert>
    }

    @if (tab() === 'imports') {
      <div class="status-groups" aria-label="Import statuses">
        @for (status of importStatuses; track status) {
          <button type="button" (click)="importStatus.set(status)">
            {{ statusLabel(status) }} ({{ imports()?.aggregates?.[status] ?? 0 }})
          </button>
        }
      </div>

      @if (importsLoading()) {
        <p role="status">Loading imports…</p>
      } @else if (importsError(); as failure) {
        <gf-alert title="Imports could not be loaded">
          <p>{{ failure.message }}</p>
          @if (failure.requestId) {
            <p>Request ID: {{ failure.requestId }}</p>
          }
          <button (click)="loadImports()">Retry</button>
        </gf-alert>
      } @else if (imports(); as queue) {
        @if (!filteredImports().length) {
          <section class="empty">
            <h2>No {{ statusLabel(importStatus()).toLowerCase() }} imports</h2>
            <p>New uploads appear here automatically as processing progresses.</p>
          </section>
        } @else {
          <div class="desktop">
            <table>
              <thead>
                <tr>
                  <th>Title / quarter</th>
                  <th>Documents</th>
                  <th>Detected</th>
                  <th>Validation</th>
                  <th>Uploaded</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredImports(); track item.id) {
                  <tr>
                    <td>
                      <strong>{{ item.title }}</strong><br />
                      {{ item.quarter?.name || 'Unassigned' }}<br />
                      <gf-badge>{{ statusLabel(item.status) }}</gf-badge>
                    </td>
                    <td>
                      {{ item.documents?.question?.filename }}<br />
                      {{ item.documents?.answerKey?.filename }}
                    </td>
                    <td>{{ item.activityCount ?? 0 }} activities<br />{{ item.questionCount ?? 0 }} questions</td>
                    <td>{{ item.errorCount ?? 0 }} errors<br />{{ item.warningCount ?? 0 }} warnings</td>
                    <td>{{ item.uploadedBy }}<br />{{ item.uploadedAt | date: 'medium' }}</td>
                    <td>{{ item.updatedAt | date: 'medium' }}</td>
                    <td>
                      <div class="actions">
                        @if (hasAction(item.allowedActions, 'review') || hasAction(item.allowedActions, 'continue_review')) {
                          <a [routerLink]="['/admin/bible/imports', item.id]">
                            {{ hasAction(item.allowedActions, 'continue_review') ? 'Continue review' : 'Review' }}
                          </a>
                        }
                        @if (hasAction(item.allowedActions, 'view_committed_content') && item.committedContentSetId) {
                          <a [routerLink]="['/admin/bible/content', item.committedContentSetId]">View committed content</a>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    } @else {
      @if (result()?.aggregates; as totals) {
        <section class="summary" aria-label="Bible content summary">
          @if (totals.total !== undefined) {
            <gf-stat-card label="Total content sets" [value]="totals.total" />
          }
          @if (totals.draft !== undefined) {
            <gf-stat-card label="Draft" [value]="totals.draft" />
          }
          @if (totals.needs_review !== undefined) {
            <gf-stat-card label="Needs review" [value]="totals.needs_review" />
          }
          @if (totals.published !== undefined) {
            <gf-stat-card label="Published" [value]="totals.published" />
          }
          @if (totals.archived !== undefined) {
            <gf-stat-card label="Archived" [value]="totals.archived" />
          }
        </section>
      }

      <form class="filters" [formGroup]="filters" (ngSubmit)="applyFilters()" aria-label="Bible content filters">
        <label>Search <input type="search" formControlName="search" /></label>
        <label>Quarter <input formControlName="quarterId" placeholder="All quarters" /></label>
        <label>
          Status
          <select formControlName="status">
            <option value="">All statuses</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ statusLabel(status) }}</option>
            }
          </select>
        </label>
        <label>
          Sort
          <select formControlName="sort">
            <option value="-updatedAt">Recently updated</option>
            <option value="title">Title A–Z</option>
            <option value="startDate">Start date</option>
          </select>
        </label>
        <button type="submit">Apply</button>
        @if (filtered()) {
          <button type="button" (click)="clearFilters()">Clear filters</button>
        }
      </form>

      @if (initialLoading()) {
        <div class="skeletons" role="status" aria-label="Loading Bible content">
          @for (row of skeletons; track row) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (error(); as failure) {
        <gf-alert [title]="errorTitle(failure)">
          <p>{{ errorMessage(failure) }}</p>
          @if (failure.requestId) {
            <p>Request ID: {{ failure.requestId }}</p>
          }
          @if (failure.status !== 403) {
            <button type="button" (click)="retry()">Retry</button>
          }
        </gf-alert>
      } @else if (result(); as list) {
        @if (refreshing()) {
          <p class="refresh" role="status">Refreshing Bible content…</p>
        }
        @if (!list.items?.length) {
          <section class="empty">
            <h2>{{ filtered() ? 'No Bible content matches these filters' : 'No Bible content yet' }}</h2>
            @if (filtered()) {
              <button type="button" (click)="clearFilters()">Clear filters</button>
            } @else {
              <p>Upload the question document and answer key to create the first draft Bible content set.</p>
              <a class="primary" routerLink="/admin/bible/imports/new">Upload Quiz</a>
            }
          </section>
        } @else {
          <p aria-live="polite">Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ list.pagination?.total ?? list.items.length }}</p>
          <div class="desktop">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Quarter</th>
                  <th>Date range</th>
                  <th>Activities</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (item of list.items; track item.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/admin/bible/content', item.id]">
                        <strong>{{ item.title }}</strong>
                      </a>
                    </td>
                    <td>{{ item.quarterName || '—' }}</td>
                    <td>{{ dateOnly(item.startDate) }} – {{ dateOnly(item.endDate) }}</td>
                    <td>{{ item.activityCount ?? 0 }}</td>
                    <td>
                      <gf-badge>{{ statusLabel(item.status) }}</gf-badge>
                    </td>
                    <td>{{ item.version }}</td>
                    <td>{{ item.updatedAt ? (item.updatedAt | date: 'medium') : '—' }}</td>
                    <td>
                      <div class="actions">
                        <a [routerLink]="['/admin/bible/content', item.id]">View</a>
                        
                        @if (canPublish(item)) {
                          <button
                            type="button"
                            class="action-btn publish-btn"
                            [disabled]="actionBusyId() === item.id"
                            (click)="publishDirect(item)"
                          >
                            {{ actionBusyId() === item.id ? 'Publishing…' : 'Publish' }}
                          </button>
                        }

                        @if (canArchive(item)) {
                          <button
                            type="button"
                            class="action-btn delete-btn"
                            [disabled]="actionBusyId() === item.id"
                            (click)="archiveDirect(item)"
                          >
                            Archive
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (list.pagination && list.pagination.totalPages > 1) {
            <nav class="pager" aria-label="Bible content pages">
              <button [disabled]="list.pagination.page <= 1" (click)="goTo(list.pagination.page - 1)">Previous</button>
              <span>Page {{ list.pagination.page }} of {{ list.pagination.totalPages }}</span>
              <button
                [disabled]="list.pagination.page >= list.pagination.totalPages"
                (click)="goTo(list.pagination.page + 1)"
              >
                Next
              </button>
            </nav>
          }
        }
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 76rem;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }
      .primary {
        display: inline-block;
        background: var(--brand);
        color: #fff;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-md);
        font-weight: 700;
        text-decoration: none;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .tabs {
        display: flex;
        gap: 0.5rem;
        border-bottom: 1px solid var(--border);
        margin-bottom: 1rem;
      }
      .tabs button {
        border: 0;
        border-bottom: 3px solid transparent;
        background: transparent;
      }
      .tabs button.active {
        border-color: var(--brand);
      }
      .count {
        display: inline-block;
        background: #e7efe2;
        padding: 0.15rem 0.45rem;
        border-radius: 1rem;
        margin-left: 0.35rem;
      }
      .status-groups {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
        padding: 1rem;
        margin-bottom: 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-weight: 700;
      }
      input,
      select,
      button {
        min-height: 44px;
        font: inherit;
        border: 1px solid var(--border);
        border-radius: 0.55rem;
        padding: 0.55rem 0.8rem;
        background: #fff;
      }
      button {
        cursor: pointer;
        font-weight: 700;
      }
      button:disabled {
        opacity: 0.5;
      }
      .action-btn {
        min-height: 32px;
        padding: 0.2rem 0.6rem;
        font-size: 0.85rem;
      }
      .publish-btn {
        background: var(--brand);
        color: #fff;
        border-color: var(--brand);
      }
      .delete-btn {
        background: transparent;
        color: #c00;
        border-color: #fcc;
      }
      .skeletons {
        display: grid;
        gap: 0.6rem;
      }
      .skeleton {
        height: 4rem;
        background: #edf0eb;
        animation: pulse 1s infinite alternate;
      }
      .refresh {
        border-top: 3px solid var(--brand);
        color: var(--muted);
      }
      .empty {
        text-align: center;
        padding: 2rem;
      }
      .empty h2 {
        font-size: 1.35rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
      }
      th,
      td {
        padding: 0.75rem;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .pager {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem;
      }
      @keyframes pulse {
        to {
          opacity: 0.45;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleComponent {
  private readonly api = inject(AdminBibleApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly tab = signal<'imports' | 'content'>(
    this.route.snapshot.queryParamMap.get('tab') === 'content' ? 'content' : 'imports',
  );

  readonly importStatuses = [
    'processing',
    'needs_correction',
    'needs_review',
    'rejected',
    'committed',
    'processing_failed',
  ] as const;

  readonly importStatus = signal<(typeof this.importStatuses)[number]>('needs_review');
  readonly imports = signal<BibleImportList | null>(null);
  readonly importsLoading = signal(true);
  readonly importsError = signal<ApiError | null>(null);

  readonly filteredImports = computed(
    () => this.imports()?.items.filter((item) => item.status === this.importStatus()) ?? [],
  );

  readonly statuses: readonly BibleContentStatus[] = [
    'draft',
    'uploaded',
    'parsing',
    'needs_review',
    'validated',
    'published',
    'archived',
    'failed',
  ];

  readonly skeletons = [1, 2, 3, 4, 5];
  readonly filters = this.fb.nonNullable.group({
    search: '',
    quarterId: '',
    status: '' as BibleContentStatus | '',
    sort: '-updatedAt' as BibleContentSort,
  });

  readonly result = signal<BibleContentList | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly initialLoading = signal(true);
  readonly refreshing = signal(false);

  readonly actionBusyId = signal<string | null>(null);
  readonly actionError = signal<ApiError | null>(null);
  readonly actionErrorTitle = signal<string>('Action failed');
  readonly showQuarterLink = signal(false);

  readonly filtered = computed(() => !!this.query.search || !!this.query.status || !!this.query.quarterId);

  readonly rangeStart = computed(() => {
    const p = this.result()?.pagination;
    return !p || !p.total ? 0 : (p.page - 1) * p.pageSize + 1;
  });

  readonly rangeEnd = computed(() => {
    const p = this.result()?.pagination;
    return p ? Math.min(p.page * p.pageSize, p.total) : 0;
  });

  private query: BibleContentQuery = { page: 1, pageSize: PAGE_SIZE, sort: '-updatedAt' };
  private sequence = 0;
  private readonly loads = new Subject<BibleContentQuery>();

  constructor() {
    this.loads
      .pipe(
        switchMap((query) => {
          const sequence = ++this.sequence;
          this.error.set(null);
          if (this.result()) this.refreshing.set(true);
          else this.initialLoading.set(true);
          return this.api.list(query).pipe(
            map((data) => ({ sequence, data }) satisfies LoadResult),
            catchError((error: ApiError) => of({ sequence, error } satisfies LoadResult)),
          );
        }),
      )
      .subscribe((response) => {
        if (response.sequence !== this.sequence) return;
        this.initialLoading.set(false);
        this.refreshing.set(false);
        if ('error' in response) this.error.set(response.error);
        else this.result.set(response.data);
      });

    this.load();
    this.loadImports();
  }

  selectTab(tab: 'imports' | 'content') {
    this.tab.set(tab);
  }

  loadImports() {
    this.importsLoading.set(true);
    this.importsError.set(null);
    this.api.listImports().subscribe({
      next: (value) => {
        this.imports.set(value);
        this.importsLoading.set(false);
      },
      error: (error: ApiError) => {
        this.importsError.set(error);
        this.importsLoading.set(false);
      },
    });
  }

  applyFilters() {
    const value = this.filters.getRawValue();
    this.query = {
      page: 1,
      pageSize: PAGE_SIZE,
      sort: value.sort,
      ...(value.search.trim() ? { search: value.search.trim() } : {}),
      ...(value.quarterId.trim() ? { quarterId: value.quarterId.trim() } : {}),
      ...(value.status ? { status: value.status } : {}),
    };
    this.load();
  }

  clearFilters() {
    this.filters.reset({ search: '', quarterId: '', status: '', sort: '-updatedAt' });
    this.applyFilters();
  }

  retry() {
    this.load();
  }

  goTo(page: number) {
    this.query = { ...this.query, page };
    this.load();
  }

  private load() {
    this.loads.next(this.query);
  }

hasAction(allowedActions: readonly string[] | undefined | null, action: string): boolean {
    return Array.isArray(allowedActions) && allowedActions.includes(action);
  }

  canPublish(item: BibleContentSet): boolean {
    if (this.hasAction(item.allowedActions, 'publish')) return true;
    return item.status === 'draft';
  }

  canArchive(item: BibleContentSet): boolean {
    if (this.hasAction(item.allowedActions, 'archive')) return true;
    return item.status !== 'archived';
  }

publishDirect(item: BibleContentSet): void {
  this.actionBusyId.set(item.id);
  this.actionError.set(null);
  this.showQuarterLink.set(false);

  this.api.publishContent(item.id, item.version).subscribe({
    next: () => {
      this.actionBusyId.set(null);
      this.load();
    },
    error: (err: ApiError) => {
      this.actionBusyId.set(null);
      this.actionError.set(err);
      if (err.status === 409 && err.message?.toLowerCase().includes('quarter must be active')) {
        this.actionErrorTitle.set('Quarter Not Active');
        this.showQuarterLink.set(true);
      } else {
        this.actionErrorTitle.set('Publish Failed');
      }
    },
  });
}

archiveDirect(item: BibleContentSet): void {
  if (!confirm(`Are you sure you want to archive "${item.title}"?`)) return;

  this.actionBusyId.set(item.id);
  this.actionError.set(null);
  this.showQuarterLink.set(false);

  this.api.archiveContent(item.id, item.version).subscribe({
    next: () => {
      this.actionBusyId.set(null);
      this.load();
    },
    error: (err: ApiError) => {
      this.actionBusyId.set(null);
      this.actionError.set(err);
      this.actionErrorTitle.set('Archive Failed');
    },
  });
}

  statusLabel(status: string) {
    return (
      (
        {
          draft: 'Draft',
          uploaded: 'Processing',
          parsing: 'Processing',
          needs_review: 'Needs Review',
          needs_correction: 'Needs correction',
          processing: 'Processing',
          committed: 'Draft created',
          rejected: 'Rejected',
          processing_failed: 'Processing failed',
          validated: 'Ready to Commit',
          published: 'Published',
          archived: 'Archived',
          failed: 'Import Failed',
        } as Record<string, string>
      )[status] ?? status
    );
  }

  errorTitle(error: ApiError) {
    return error.status === 403
      ? 'You do not have permission to manage Bible content'
      : error.status === 404
        ? 'Bible administration unavailable'
        : 'Bible content could not be loaded';
  }

  errorMessage(error: ApiError) {
    return error.status === 404
      ? 'Bible administration is not available from the current service deployment.'
      : error.status === 403
        ? ''
        : 'Try again. If the problem continues, contact an administrator.';
  }

  dateOnly(value?: string | null) {
    if (!value) return '—';
    const [y, m, d] = value.split('-').map(Number);
    return y && m && d
      ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
          new Date(Date.UTC(y, m - 1, d)),
        )
      : value;
  }
}
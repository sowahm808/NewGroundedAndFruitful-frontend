import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfBadge, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { normalizeDate } from '../../shared/utilities/date-normalization';
import {
  AdminUser,
  AdminUsersApiService,
  AdminUsersPayload,
  AdminUsersQuery,
  UserStatus,
} from './admin-users-api.service';

const PAGE_SIZE = 25;
const STATUSES: readonly UserStatus[] = ['active', 'disabled', 'suspended', 'invited'];
const SORTS: readonly { value: NonNullable<AdminUsersQuery['sort']>; label: string }[] = [
  { value: '-updatedAt', label: 'Recently updated' },
  { value: 'displayName', label: 'Name A–Z' },
];

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, GfAlert, GfBadge, GfEmptyState, GfPageHeader],
  template: `
    <gf-page-header title="Users" eyebrow="Administration">
      <p>Review user identities, roles, and organization access.</p>
    </gf-page-header>

    <form class="filters" (ngSubmit)="applyFilters()">
      <label
        >Search
        <input name="search" type="search" [(ngModel)]="draftSearch" maxlength="120" autocomplete="off" />
      </label>
      <label
        >Status
        <select name="status" [(ngModel)]="draftStatus">
          <option value="">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ humanize(status) }}</option>
          }
        </select>
      </label>
      <label
        >Sort
        <select name="sort" [(ngModel)]="draftSort">
          @for (sort of sorts; track sort.value) {
            <option [value]="sort.value">{{ sort.label }}</option>
          }
        </select>
      </label>
      <button type="submit">Apply</button>
      @if (hasActiveFilters()) {
        <span class="active-filter" role="status">Filters applied</span>
      }
    </form>

    @if (initialLoading()) {
      <div class="skeletons" role="status" aria-label="Loading users">
        @for (row of skeletonRows; track row) {
          <div class="skeleton"></div>
        }
      </div>
    } @else if (error(); as failure) {
      <gf-alert title="Unable to load users">
        <p>{{ failure.message }}</p>
        <button type="button" (click)="retry()">Retry</button>
      </gf-alert>
    } @else if (payload(); as result) {
      @if (refreshing()) {
        <div class="refreshing" role="status">Updating users…</div>
      }
      @if (!result.items.length) {
        <gf-empty-state title="No users match the current filters" message="Try changing the status filter." />
      } @else {
        <p class="result-count" aria-live="polite">
          Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ result.pagination.total }}
        </p>
        <div class="desktop-table">
          <table>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Roles</th>
                <th scope="col">Status</th>
                <th scope="col">Organizations</th>
                <th scope="col">Last updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of result.items; track user.id) {
                <tr>
                  <td>
                    <strong>{{ user.displayName }}</strong
                    ><span>{{ user.email }}</span>
                  </td>
                  <td>
                    <div class="badges">
                      @for (role of user.roles; track role) {
                        <gf-badge>{{ humanize(role) }}</gf-badge>
                      }
                    </div>
                  </td>
                  <td>
                    <gf-badge>{{ humanize(user.status) }}</gf-badge
                    ><span class="sr-only">Account status: {{ humanize(user.status) }}</span>
                  </td>
                  <td>{{ organizationLabel(user) }}</td>
                  <td>
                    @if (updatedAt(user); as date) {
                      {{ date | date: 'medium' }}
                    } @else {
                      Not available
                    }
                  </td>
                  <td>
                    <span class="read-only" [attr.aria-label]="'No actions available for ' + user.displayName"
                      >Read-only</span
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="mobile-cards">
          @for (user of result.items; track user.id) {
            <article [attr.aria-labelledby]="'user-' + user.id">
              <h2 [id]="'user-' + user.id">{{ user.displayName }}</h2>
              <p>{{ user.email }}</p>
              <dl>
                <div>
                  <dt>Roles</dt>
                  <dd class="badges">
                    @for (role of user.roles; track role) {
                      <gf-badge>{{ humanize(role) }}</gf-badge>
                    }
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <gf-badge>{{ humanize(user.status) }}</gf-badge
                    ><span class="sr-only">Account status: {{ humanize(user.status) }}</span>
                  </dd>
                </div>
                <div>
                  <dt>Organizations</dt>
                  <dd>{{ organizationLabel(user) }}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>
                    @if (updatedAt(user); as date) {
                      {{ date | date: 'medium' }}
                    } @else {
                      Not available
                    }
                  </dd>
                </div>
                <div>
                  <dt>Actions</dt>
                  <dd>Read-only</dd>
                </div>
              </dl>
            </article>
          }
        </div>
        <nav class="pagination" aria-label="User pages">
          <button type="button" [disabled]="previousDisabled()" (click)="goTo(result.pagination.page - 1)">
            Previous
          </button>
          <span>Page {{ result.pagination.page }} of {{ result.pagination.totalPages }}</span>
          <button type="button" [disabled]="nextDisabled()" (click)="goTo(result.pagination.page + 1)">Next</button>
        </nav>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 76rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-weight: 700;
      }
      select,
      input,
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
        cursor: not-allowed;
      }
      .filters button {
        background: var(--brand);
        color: #fff;
      }
      .active-filter {
        color: var(--brand-dark);
        font-weight: 700;
        align-self: center;
      }
      .refreshing {
        height: 3px;
        overflow: hidden;
        background: var(--leaf-soft);
        color: transparent;
        margin-bottom: 0.75rem;
        animation: pulse 1s infinite alternate;
      }
      .skeletons {
        display: grid;
        gap: 0.6rem;
      }
      .skeleton {
        height: 4.5rem;
        border-radius: var(--radius-md);
        background: linear-gradient(90deg, #e9ece7, #f6f7f4, #e9ece7);
        background-size: 200%;
        animation: shimmer 1.3s infinite;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
        box-shadow: var(--shadow);
      }
      th,
      td {
        padding: 0.9rem;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 0.8rem;
        text-transform: uppercase;
      }
      td:first-child span {
        display: block;
        color: var(--muted);
        margin-top: 0.2rem;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .result-count,
      .read-only {
        color: var(--muted);
      }
      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem 0;
      }
      .mobile-cards {
        display: none;
      }
      article {
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }
      article h2,
      article p {
        margin: 0 0 0.3rem;
      }
      dl {
        display: grid;
        gap: 0.75rem;
      }
      dl div {
        display: grid;
        grid-template-columns: 8rem 1fr;
      }
      dt {
        color: var(--muted);
      }
      dd {
        margin: 0;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      @media (max-width: 760px) {
        .desktop-table {
          display: none;
        }
        .mobile-cards {
          display: grid;
          gap: 1rem;
        }
      }
      @keyframes shimmer {
        to {
          background-position: -200% 0;
        }
      }
      @keyframes pulse {
        to {
          opacity: 0.35;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly api = inject(AdminUsersApiService);
  private readonly router = inject(Router);
  private readonly requests = new Subject<AdminUsersQuery>();
  readonly payload = signal<AdminUsersPayload | null>(null);
  readonly initialLoading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly statuses = STATUSES;
  readonly sorts = SORTS;
  readonly skeletonRows = [1, 2, 3, 4];
  draftStatus = '';
  draftSearch = '';
  draftSort: NonNullable<AdminUsersQuery['sort']> = '-updatedAt';
  private appliedStatus = '';
  private appliedSearch = '';
  private appliedSort: NonNullable<AdminUsersQuery['sort']> = '-updatedAt';
  private currentPage = 1;
  readonly hasActiveFilters = computed(
    () => Boolean(this.appliedSearch || this.appliedStatus) || this.appliedSort !== '-updatedAt',
  );
  readonly rangeStart = computed(() => {
    const pagination = this.payload()?.pagination;
    return !pagination?.total ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  });
  readonly rangeEnd = computed(() => {
    const pagination = this.payload()?.pagination;
    return pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;
  });
  readonly previousDisabled = computed(
    () => !this.payload() || this.payload()!.pagination.page <= 1 || this.refreshing(),
  );
  readonly nextDisabled = computed(
    () =>
      !this.payload() || this.payload()!.pagination.page >= this.payload()!.pagination.totalPages || this.refreshing(),
  );

  constructor() {
    this.requests
      .pipe(
        switchMap((query) =>
          this.api.listUsers(query).pipe(
            map((payload) => ({ payload, error: null })),
            catchError((error: unknown) => of({ payload: null, error: asApiError(error) })),
          ),
        ),
      )
      .subscribe(({ payload, error }) => {
        this.initialLoading.set(false);
        this.refreshing.set(false);
        if (error?.status === 403) void this.router.navigateByUrl('/unauthorized');
        else if (error) this.error.set(error);
        else {
          this.payload.set(payload);
          this.error.set(null);
        }
      });
    queueMicrotask(() => this.request(1));
  }

  applyFilters(): void {
    this.appliedSearch = this.draftSearch.trim().slice(0, 120);
    this.appliedStatus = STATUSES.includes(this.draftStatus as UserStatus) ? this.draftStatus : '';
    this.appliedSort = SORTS.some(({ value }) => value === this.draftSort) ? this.draftSort : '-updatedAt';
    this.request(1);
  }
  retry(): void {
    this.request(this.currentPage);
  }
  goTo(page: number): void {
    if (!this.refreshing()) this.request(page);
  }
  humanize(value: string): string {
    return value
      .split('_')
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
      .join(' ');
  }
  organizationLabel(user: AdminUser): string {
    return user.organizationIds.length ? String(user.organizationIds.length) : 'None';
  }
  updatedAt(user: AdminUser): Date | null {
    return normalizeDate(user.updatedAt);
  }

  private request(page: number): void {
    this.currentPage = page;
    this.error.set(null);
    if (this.payload()) this.refreshing.set(true);
    else this.initialLoading.set(true);
    this.requests.next({
      page,
      pageSize: PAGE_SIZE,
      status: (this.appliedStatus || undefined) as UserStatus | undefined,
      sort: this.appliedSort,
      search: this.appliedSearch || undefined,
    });
  }
}

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(-1, 'unexpected_error', 'The request could not be completed.');
}

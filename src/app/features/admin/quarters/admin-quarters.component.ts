import { A11yModule } from '@angular/cdk/a11y';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Subject, catchError, finalize, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { GfAlert, GfBadge, GfEmptyState, GfPageHeader } from '../../../shared/components/design-system';
import {
  AdminQuartersApiService,
  Quarter,
  QuarterAction,
  QuarterList,
  QuarterQuery,
  QuarterSort,
  QuarterStatus,
} from './admin-quarters-api.service';

const PAGE_SIZE = 20;
type LoadResult = { sequence: number; data?: QuarterList; error?: ApiError };

function dateRange(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startsOn')?.value as string;
  const end = control.get('endsOn')?.value as string;
  return start && end && start > end ? { dateRange: true } : null;
}

@Component({
  standalone: true,
  imports: [A11yModule, DatePipe, ReactiveFormsModule, GfAlert, GfBadge, GfEmptyState, GfPageHeader],
  template: `
    <gf-page-header title="Quarters" eyebrow="Administration"
      ><p>Configure program quarter dates and lifecycle.</p></gf-page-header
    >
    @if (notice()) {
      <p class="notice" role="status">{{ notice() }}</p>
    }
    <form class="filters" [formGroup]="filters" (ngSubmit)="applyFilters()" aria-label="Quarter filters">
      <label>Search <input formControlName="search" type="search" /></label>
      <label
        >Status
        <select formControlName="status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ label(s) }}</option>
          }
        </select></label
      >
      <label
        >Sort
        <select formControlName="sort">
          @for (s of sorts; track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select></label
      >
      <button type="submit">Apply</button>
      @if (canManage()) {
        <button type="button" class="primary" (click)="openCreate()">Create quarter</button>
      }
    </form>
    @if (initialLoading()) {
      <div class="skeletons" role="status" aria-label="Loading quarters">
        @for (n of skeletons; track n) {
          <div class="skeleton"></div>
        }
      </div>
    } @else if (forbidden()) {
      <gf-alert title="Access denied"><p>You do not have permission to view quarters.</p></gf-alert>
    } @else if (error(); as failure) {
      <gf-alert title="Unable to load quarters"
        ><p>{{ failure.message }}</p>
        <button type="button" (click)="retry()">Retry</button></gf-alert
      >
    } @else if (result(); as list) {
      @if (refreshing()) {
        <p class="refresh" role="status">Refreshing quarters…</p>
      }
      @if (!list.items.length) {
        <gf-empty-state
          [title]="filtered() ? 'No quarters match these filters' : 'No quarters yet'"
          [message]="filtered() ? 'Change or clear the filters and try again.' : 'Create a quarter to get started.'"
        />
      } @else {
        <p aria-live="polite">Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ list.pagination.total }}</p>
        <div class="desktop">
          <table>
            <thead>
              <tr>
                <th scope="col">Quarter</th>
                <th scope="col">Date range</th>
                <th scope="col">Status</th>
                <th scope="col">Organization</th>
                <th scope="col">Last updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (q of list.items; track q.id) {
                <tr>
                  <td>
                    <strong>{{ q.name }}</strong>
                  </td>
                  <td>{{ dateOnly(q.startsOn) }} – {{ dateOnly(q.endsOn) }}</td>
                  <td>
                    <gf-badge>{{ label(q.status) }}</gf-badge>
                  </td>
                  <td>{{ q.organization?.name || '—' }}</td>
                  <td>{{ q.updatedAt | date: 'medium' }}</td>
                  <td>
                    <div class="actions">
                      @for (a of q.allowedActions; track a) {
                        @if (a === 'edit') {
                          <button type="button" (click)="openEdit(q)">Edit</button>
                        } @else {
                          <button type="button" [disabled]="mutating()" (click)="beginAction(q, a)">
                            {{ label(a) }}
                          </button>
                        }
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="mobile">
          @for (q of list.items; track q.id) {
            <article>
              <h2>{{ q.name }}</h2>
              <dl>
                <div>
                  <dt>Date range</dt>
                  <dd>{{ dateOnly(q.startsOn) }} – {{ dateOnly(q.endsOn) }}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{{ label(q.status) }}</dd>
                </div>
                <div>
                  <dt>Organization</dt>
                  <dd>{{ q.organization?.name || '—' }}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{{ q.updatedAt | date: 'medium' }}</dd>
                </div>
              </dl>
              <div class="actions">
                @for (a of q.allowedActions; track a) {
                  <button
                    type="button"
                    [disabled]="mutating()"
                    (click)="a === 'edit' ? openEdit(q) : beginAction(q, a)"
                  >
                    {{ label(a) }}
                  </button>
                }
              </div>
            </article>
          }
        </div>
        <nav aria-label="Quarter pages" class="pager">
          <button type="button" [disabled]="list.pagination.page <= 1" (click)="goTo(list.pagination.page - 1)">
            Previous</button
          ><span>Page {{ list.pagination.page }} of {{ list.pagination.totalPages }}</span
          ><button
            type="button"
            [disabled]="list.pagination.page >= list.pagination.totalPages"
            (click)="goTo(list.pagination.page + 1)"
          >
            Next
          </button>
        </nav>
      }
    }
    @if (editing()) {
      <div class="backdrop" (click)="closeDialog()"></div>
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        (keydown.escape)="closeDialog()"
      >
        <h2 id="form-title">{{ editing()!.id ? 'Edit' : 'Create' }} quarter</h2>
        @if (conflict()) {
          <gf-alert title="Quarter changed"
            ><p>This quarter was changed by someone else. Reload it before editing again.</p>
            <button type="button" (click)="reloadConflict()">Reload quarter</button></gf-alert
          >
        }
        @if (mutationError(); as e) {
          <gf-alert title="Unable to save"
            ><p>{{ e.message }}</p></gf-alert
          >
        }
        <form [formGroup]="quarterForm" (ngSubmit)="save()">
          <label for="quarter-name">Name</label><input id="quarter-name" formControlName="name" maxlength="120" />
          @if (invalid('name')) {
            <p class="field-error">Enter a name of 120 characters or fewer.</p>
          }
          <label for="starts-on">Start date</label><input id="starts-on" type="date" formControlName="startsOn" />
          @if (invalid('startsOn')) {
            <p class="field-error">Enter a valid start date.</p>
          }
          <label for="ends-on">End date</label><input id="ends-on" type="date" formControlName="endsOn" />
          @if (invalid('endsOn')) {
            <p class="field-error">Enter a valid end date.</p>
          }
          @if (quarterForm.hasError('dateRange')) {
            <p class="field-error">Start date must be on or before end date.</p>
          }
          <div class="actions">
            <button type="button" (click)="closeDialog()">Cancel</button
            ><button class="primary" [disabled]="mutating()" type="submit">
              {{ mutating() ? 'Saving…' : 'Save quarter' }}
            </button>
          </div>
        </form>
      </section>
    }
    @if (confirmation(); as c) {
      <div class="backdrop"></div>
      <section
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-impact"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        (keydown.escape)="confirmation.set(null)"
      >
        <h2 id="confirm-title">{{ label(c.action) }} {{ c.quarter.name }}?</h2>
        <p id="confirm-impact">{{ impact(c.action) }}</p>
        <div class="actions">
          <button type="button" (click)="confirmation.set(null)">Cancel</button
          ><button class="danger" type="button" [disabled]="mutating()" (click)="runAction()">
            Confirm {{ label(c.action).toLowerCase() }}
          </button>
        </div>
      </section>
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
      .primary {
        background: var(--brand);
        color: #fff;
      }
      .danger {
        background: #a92c2c;
        color: #fff;
      }
      .notice {
        padding: 0.75rem;
        background: var(--leaf-soft);
        font-weight: 700;
      }
      .refresh {
        border-top: 3px solid var(--brand);
        color: var(--muted);
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
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
      }
      th,
      td {
        padding: 0.85rem;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .pager {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem;
      }
      .mobile {
        display: none;
      }
      article {
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
        margin-bottom: 1rem;
      }
      dl div {
        display: grid;
        grid-template-columns: 8rem 1fr;
        margin: 0.5rem 0;
      }
      dt {
        font-weight: 700;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: #0008;
        z-index: 20;
      }
      .dialog {
        position: fixed;
        z-index: 21;
        inset: 50% auto auto 50%;
        transform: translate(-50%, -50%);
        width: min(32rem, calc(100% - 2rem));
        max-height: 90vh;
        overflow: auto;
        background: #fff;
        padding: 1.5rem;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
      }
      .dialog form {
        display: grid;
        gap: 0.45rem;
      }
      .field-error {
        color: #9d2020;
        margin: 0.1rem 0 0.5rem;
      }
      @keyframes pulse {
        to {
          opacity: 0.45;
        }
      }
      @media (max-width: 700px) {
        .desktop {
          display: none;
        }
        .mobile {
          display: block;
        }
        .filters label {
          width: 100%;
        }
      }
      @media (min-width: 701px) {
        .desktop {
          display: block;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQuartersComponent {
  private readonly api = inject(AdminQuartersApiService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly statuses: readonly QuarterStatus[] = ['draft', 'active', 'closed', 'archived'];
  readonly sorts: readonly { value: QuarterSort; label: string }[] = [
    { value: '-updatedAt', label: 'Recently updated' },
    { value: 'name', label: 'Name A–Z' },
    { value: 'startsOn', label: 'Start date' },
  ];
  readonly skeletons = [1, 2, 3, 4];
  readonly filters = this.fb.nonNullable.group({
    search: '',
    status: '' as QuarterStatus | '',
    sort: '-updatedAt' as QuarterSort,
  });
  readonly quarterForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(120)]],
      startsOn: ['', Validators.required],
      endsOn: ['', Validators.required],
    },
    { validators: dateRange },
  );
  readonly result = signal<QuarterList | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly initialLoading = signal(true);
  readonly refreshing = signal(false);
  readonly forbidden = signal(false);
  readonly mutating = signal(false);
  readonly editing = signal<(Quarter | { id: '' }) | null>(null);
  readonly confirmation = signal<{ quarter: Quarter; action: Exclude<QuarterAction, 'edit'> } | null>(null);
  readonly mutationError = signal<ApiError | null>(null);
  readonly conflict = signal(false);
  readonly notice = signal('');
  readonly filtered = computed(() => !!this.query.status || !!this.query.search);
  readonly canManage = computed(() => this.auth.hasRole(['admin', 'super_admin']));
  readonly rangeStart = computed(() => {
    const p = this.result()?.pagination;
    return !p || p.total === 0 ? 0 : (p.page - 1) * p.pageSize + 1;
  });
  readonly rangeEnd = computed(() => {
    const p = this.result()?.pagination;
    return p ? Math.min(p.page * p.pageSize, p.total) : 0;
  });
  private query: QuarterQuery = { page: 1, pageSize: PAGE_SIZE, sort: '-updatedAt' };
  private sequence = 0;
  private readonly loads = new Subject<QuarterQuery>();
  constructor() {
    this.loads
      .pipe(
        switchMap((q) => {
          const sequence = ++this.sequence;
          this.error.set(null);
          this.result() ? this.refreshing.set(true) : this.initialLoading.set(true);
          return this.api.list(q).pipe(
            map((data) => ({ sequence, data }) satisfies LoadResult),
            catchError((error: ApiError) => of({ sequence, error } satisfies LoadResult)),
          );
        }),
      )
      .subscribe((x) => {
        if (x.sequence !== this.sequence) return;
        this.initialLoading.set(false);
        this.refreshing.set(false);
        if ('error' in x) {
          this.forbidden.set(x.error.status === 403);
          this.error.set(x.error.status === 403 ? null : x.error);
        } else {
          this.forbidden.set(false);
          this.result.set(x.data);
        }
      });
    this.load();
  }
  applyFilters() {
    const v = this.filters.getRawValue();
    this.query = {
      page: 1,
      pageSize: PAGE_SIZE,
      sort: v.sort,
      ...(v.status ? { status: v.status } : {}),
      ...(v.search.trim() ? { search: v.search.trim() } : {}),
    };
    this.load();
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
  openCreate() {
    this.editing.set({ id: '' });
    this.quarterForm.reset();
    this.resetMutation();
  }
  openEdit(q: Quarter) {
    this.editing.set(q);
    this.quarterForm.setValue({ name: q.name, startsOn: q.startsOn, endsOn: q.endsOn });
    this.resetMutation();
  }
  closeDialog() {
    if (!this.mutating()) this.editing.set(null);
  }
  invalid(name: string) {
    const c = this.quarterForm.get(name);
    return !!c && (c.touched || this.quarterForm.touched) && c.invalid;
  }
  save() {
    this.quarterForm.markAllAsTouched();
    if (this.quarterForm.invalid || this.mutating()) return;
    const record = this.editing()!;
    const value = this.quarterForm.getRawValue();
    const body = { name: value.name.trim(), startsOn: value.startsOn, endsOn: value.endsOn };
    if (!body.name) {
      this.quarterForm.controls.name.setErrors({ required: true });
      return;
    }
    this.mutating.set(true);
    const request = record.id
      ? this.api.update(record.id, { ...body, expectedVersion: (record as Quarter).version })
      : this.api.create(body);
    request.pipe(finalize(() => this.mutating.set(false))).subscribe({
      next: (q) => {
        this.editing.set(null);
        this.notice.set(`${q.name} was saved.`);
        this.load();
      },
      error: (e: ApiError) => {
        this.mutationError.set(e);
        this.conflict.set(e.status === 409);
      },
    });
  }
  beginAction(q: Quarter, a: Exclude<QuarterAction, 'edit'>) {
    if (a === 'close' || a === 'archive') this.confirmation.set({ quarter: q, action: a });
    else this.execute(q, a);
  }
  runAction() {
    const c = this.confirmation();
    if (c) this.execute(c.quarter, c.action);
  }
  private execute(q: Quarter, a: Exclude<QuarterAction, 'edit'>) {
    if (this.mutating()) return;
    this.mutating.set(true);
    this.api
      .command(q, a)
      .pipe(finalize(() => this.mutating.set(false)))
      .subscribe({
        next: (updated) => {
          this.confirmation.set(null);
          this.notice.set(`${updated.name} was ${a}d.`);
          this.load();
        },
        error: (e: ApiError) => {
          this.confirmation.set(null);
          this.error.set(e);
        },
      });
  }
  reloadConflict() {
    this.editing.set(null);
    this.load();
  }
  private resetMutation() {
    this.mutationError.set(null);
    this.conflict.set(false);
  }
  dateOnly(value: string) {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return value;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  label(v: string) {
    return v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  }
  impact(a: string) {
    return a === 'close'
      ? 'Closing prevents new quarter activity and cannot be treated as active.'
      : 'Archiving removes this quarter from normal active workflows while retaining its history.';
  }
}

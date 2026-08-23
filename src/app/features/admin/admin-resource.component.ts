import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfBadge, GfEmptyState, GfLoading, GfPageHeader } from '../../shared/components/design-system';
import { AdminApiService, AdminPage, AdminRecord } from './admin-api.service';

export interface AdminResourceDefinition {
  readonly resource: string;
  readonly title: string;
  readonly description: string;
  readonly statuses: readonly string[];
  readonly sorts: readonly { value: string; label: string }[];
  readonly actions: Readonly<Record<string, { label: string; consequence: string }>>;
}

@Component({
  selector: 'gf-admin-resource',
  standalone: true,
  imports: [DatePipe, FormsModule, GfAlert, GfBadge, GfEmptyState, GfLoading, GfPageHeader],
  template: `
    <gf-page-header [title]="definition().title" eyebrow="Administration">
      <p>{{ definition().description }}</p>
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
          @for (status of definition().statuses; track status) {
            <option [value]="status">{{ status }}</option>
          }
        </select>
      </label>
      <label
        >Sort
        <select name="sort" [(ngModel)]="draftSort">
          @for (sort of definition().sorts; track sort.value) {
            <option [value]="sort.value">{{ sort.label }}</option>
          }
        </select>
      </label>
      <button type="submit">Apply</button>
    </form>

    @if (loading()) {
      <gf-loading />
    } @else if (error(); as failure) {
      <gf-alert title="Unable to load records">
        <p>{{ failure.message }}</p>
        @if (failure.requestId) {
          <p class="request-id">
            Request ID: <code>{{ failure.requestId }}</code>
          </p>
        }
        <button type="button" (click)="load()">Try again</button>
      </gf-alert>
    } @else if (!page()?.items?.length) {
      <gf-empty-state [title]="emptyTitle()" message="Try another allowlisted status filter." />
    } @else {
      <p class="result-count" aria-live="polite">Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ page()!.total }}</p>
      <div class="records">
        @for (record of page()!.items; track record.id) {
          <article>
            <div class="record-heading">
              <div>
                <h2>{{ record.label }}</h2>
                @if (record.secondary) {
                  <p>{{ record.secondary }}</p>
                }
              </div>
              <gf-badge>{{ record.status }}</gf-badge>
            </div>
            <dl>
              <div>
                <dt>Lifecycle</dt>
                <dd>{{ record.status }}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{{ record.version }}</dd>
              </div>
              @if (record.updatedAt) {
                <div>
                  <dt>Updated</dt>
                  <dd>{{ record.updatedAt | date: 'medium' }}</dd>
                </div>
              }
            </dl>
            @if (actionError()[record.id]; as failure) {
              <p class="inline-error" role="alert">
                {{ failure.message }}
                @if (failure.code === 'business_conflict') {
                  The record changed on the server; reload before retrying.
                }
                @if (failure.requestId) {
                  <span>
                    Request ID: <code>{{ failure.requestId }}</code></span
                  >
                }
              </p>
            }
            <div class="actions">
              @for (action of visibleActions(record); track action) {
                <button type="button" [disabled]="busyId() === record.id" (click)="confirm(record, action)">
                  {{ definition().actions[action].label }}
                </button>
              }
              @if (!visibleActions(record).length) {
                <span>Read-only for your current server-authorized scope.</span>
              }
            </div>
          </article>
        }
      </div>
      <nav class="pagination" aria-label="Results pages">
        <button type="button" [disabled]="page()!.page <= 1 || loading()" (click)="goTo(page()!.page - 1)">
          Previous
        </button>
        <span>Page {{ page()!.page }} of {{ pageCount() }}</span>
        <button type="button" [disabled]="page()!.page >= pageCount() || loading()" (click)="goTo(page()!.page + 1)">
          Next
        </button>
      </nav>
    }

    @if (pending(); as command) {
      <div class="backdrop" role="presentation">
        <section
          class="dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-copy"
        >
          <h2 id="confirm-title">Confirm {{ definition().actions[command.action].label }}</h2>
          <p id="confirm-copy">{{ definition().actions[command.action].consequence }}</p>
          <p>
            This command applies to <strong>{{ command.record.label }}</strong
            >.
          </p>
          <div>
            <button type="button" (click)="pending.set(null)">Cancel</button
            ><button class="danger" type="button" (click)="runCommand()">Confirm</button>
          </div>
        </section>
      </div>
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
      .filters button,
      .danger {
        background: var(--brand);
        color: #fff;
      }
      .records {
        display: grid;
        gap: 1rem;
      }
      article {
        padding: 1.2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
      }
      .record-heading,
      .actions,
      .pagination,
      .dialog > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .record-heading h2 {
        margin: 0;
      }
      .record-heading p {
        margin: 0.25rem 0;
        color: var(--muted);
      }
      dl {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
      }
      dl div {
        display: grid;
        gap: 0.15rem;
      }
      dt {
        font-size: 0.8rem;
        color: var(--muted);
        text-transform: uppercase;
      }
      dd {
        margin: 0;
      }
      .actions {
        justify-content: flex-start;
        flex-wrap: wrap;
      }
      .actions span,
      .result-count {
        color: var(--muted);
      }
      .inline-error {
        color: #8b1e1e;
      }
      .request-id,
      code {
        overflow-wrap: anywhere;
      }
      .pagination {
        justify-content: center;
        margin: 1.5rem 0;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: #0008;
        display: grid;
        place-items: center;
        padding: 1rem;
      }
      .dialog {
        max-width: 32rem;
        background: #fff;
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        box-shadow: 0 1rem 4rem #0005;
      }
      .dialog h2 {
        margin-top: 0;
      }
      .dialog > div {
        justify-content: flex-end;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminResourceComponent implements OnInit {
  readonly definition = input.required<AdminResourceDefinition>();
  private readonly api = inject(AdminApiService);
  readonly page = signal<AdminPage | null>(null);
  readonly loading = signal(true);
  readonly error = signal<ApiError | null>(null);
  readonly actionError = signal<Record<string, ApiError>>({});
  readonly busyId = signal<string | null>(null);
  readonly pending = signal<{ record: AdminRecord; action: string } | null>(null);
  draftStatus = '';
  draftSearch = '';
  draftSort = '-updatedAt';
  private status = '';
  private search = '';
  private sort = '-updatedAt';
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.page()?.total ?? 0) / (this.page()?.pageSize ?? 25))),
  );
  readonly rangeStart = computed(() => (this.page()?.total ? (this.page()!.page - 1) * this.page()!.pageSize + 1 : 0));
  readonly rangeEnd = computed(() =>
    Math.min(this.page()?.total ?? 0, (this.page()?.page ?? 1) * (this.page()?.pageSize ?? 25)),
  );
  readonly emptyTitle = computed(() =>
    this.definition().resource === 'participants' ? 'No participants have been enrolled.' : 'No records found',
  );

  ngOnInit(): void {
    // Required signal inputs are guaranteed to be bound before Angular invokes
    // lifecycle hooks. Do not move this request back to a field initializer,
    // constructor, or independently queued microtask: each can run before the
    // routed wrapper has supplied `definition` and will raise NG0950.
    this.load();
  }
  load(page = 1): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list(this.definition().resource, {
        page,
        pageSize: 25,
        status: this.status || undefined,
        sort: this.sort,
        search: this.search || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (result) => this.page.set(result), error: (error) => this.error.set(asApiError(error)) });
  }
  applyFilters(): void {
    this.search = this.draftSearch.trim().slice(0, 120);
    this.status = this.definition().statuses.includes(this.draftStatus) ? this.draftStatus : '';
    this.sort = this.definition().sorts.some((s) => s.value === this.draftSort)
      ? this.draftSort
      : this.definition().sorts[0].value;
    this.load();
  }
  goTo(page: number): void {
    this.load(page);
  }
  visibleActions(record: AdminRecord): readonly string[] {
    return (record.allowedActions ?? []).filter((action) => Object.hasOwn(this.definition().actions, action));
  }
  confirm(record: AdminRecord, action: string): void {
    if (this.visibleActions(record).includes(action)) this.pending.set({ record, action });
  }
  runCommand(): void {
    const command = this.pending();
    if (!command) return;
    this.pending.set(null);
    this.busyId.set(command.record.id);
    this.api
      .command(this.definition().resource, command.record, command.action)
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: (updated) => {
          this.page.update((page) =>
            page ? { ...page, items: page.items.map((item) => (item.id === updated.id ? updated : item)) } : page,
          );
          this.actionError.update((errors) => {
            const copy = { ...errors };
            delete copy[command.record.id];
            return copy;
          });
        },
        error: (error) => this.actionError.update((errors) => ({ ...errors, [command.record.id]: asApiError(error) })),
      });
  }
}

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(-1, 'unexpected_error', 'The request could not be completed.');
}

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  GfAlert,
  GfBadge,
  GfEmptyState,
  GfPageHeader,
} from '../../../shared/components/design-system';

export interface BookItem {
  id: string;
  title: string;
  author: string;
  scheduledQuarter?: string;
  targetWeek: number;
  readingWindowDays: number;
  points: number;
  summaryPrompt?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

@Component({
  selector: 'gf-admin-books',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GfAlert,
    GfBadge,
    GfEmptyState,
    GfPageHeader,
  ],
  template: `
    <gf-page-header title="Books & reading assignments" eyebrow="Administration">
      <p>Manage the reading catalog, weekly chapter assignments, and assigned reading windows.</p>
    </gf-page-header>

    <div class="books-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Filter Bar & Create Trigger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search books & chapters..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            style="padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 6px; min-width: 220px;"
          />
          <select
            [value]="selectedStatus()"
            (change)="onStatusChange($event)"
            style="padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 6px;"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <button
          type="button"
          class="gf-button gf-button--primary"
          style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 6px; background: #1b4d3e; color: #fff; border: none; font-weight: 600;"
          (click)="openModal()"
        >
          + Add Book / Reading
        </button>
      </div>

      <!-- Create Book Modal -->
      @if (showModal()) {
        <div
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;"
        >
          <div
            class="modal-card"
            style="background: #ffffff; padding: 2rem; border-radius: 8px; width: 100%; max-width: 520px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);"
          >
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Add Reading Catalog Entry</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="bookForm" (ngSubmit)="onCreateBook()">
              <div style="margin-bottom: 1rem;">
                <label for="title" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Book Title & Chapter
                </label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  placeholder="e.g. The Lion of Courage - Chapter 1"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="author" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Author
                </label>
                <input
                  id="author"
                  type="text"
                  formControlName="author"
                  placeholder="e.g. C.S. Lewis"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="targetWeek" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Target Week (1-12)
                  </label>
                  <input
                    id="targetWeek"
                    type="number"
                    formControlName="targetWeek"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </div>
                <div>
                  <label for="readingWindowDays" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Window (Days)
                  </label>
                  <input
                    id="readingWindowDays"
                    type="number"
                    formControlName="readingWindowDays"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </div>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="points" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Participation Points Award
                </label>
                <input
                  id="points"
                  type="number"
                  formControlName="points"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="summaryPrompt" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Reflection & Discussion Prompt
                </label>
                <textarea
                  id="summaryPrompt"
                  rows="3"
                  formControlName="summaryPrompt"
                  placeholder="What character quality did the main character display?"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"
                ></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button
                  type="button"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;"
                  (click)="closeModal()"
                  [disabled]="isSubmitting()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: none; background: #1b4d3e; color: #fff; font-weight: 600;"
                  [disabled]="bookForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Add Book' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Data Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading books & reading assignments...</div>
      } @else if (books().length === 0) {
        <gf-empty-state
          title="No books & reading assignments found"
          message="Create your first book entry using the '+ Add Book / Reading' button above."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">Week</th>
                <th style="padding: 0.75rem 1rem;">Book & Chapter</th>
                <th style="padding: 0.75rem 1rem;">Author</th>
                <th style="padding: 0.75rem 1rem;">Window</th>
                <th style="padding: 0.75rem 1rem;">Points</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of books(); track item.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem; font-weight: 600;">Wk {{ item.targetWeek }}</td>
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ item.title }}</strong>
                    @if (item.summaryPrompt) {
                      <div style="color: #666; font-size: 0.8rem;">Prompt: {{ item.summaryPrompt }}</div>
                    }
                  </td>
                  <td style="padding: 0.75rem 1rem;">{{ item.author }}</td>
                  <td style="padding: 0.75rem 1rem;">{{ item.readingWindowDays }} days</td>
                  <td style="padding: 0.75rem 1rem;">{{ item.points }} pts</td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ item.status }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    @if (item.status === 'draft') {
                      <button
                        type="button"
                        style="padding: 0.3rem 0.6rem; cursor: pointer; border: 1px solid #1b4d3e; background: #1b4d3e; color: #fff; border-radius: 4px; font-size: 0.8rem;"
                        (click)="publishBook(item)"
                      >
                        Publish
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBooksComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly books = signal<BookItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly bookForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    author: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    targetWeek: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    readingWindowDays: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
    points: [50, [Validators.required, Validators.min(10)]],
    summaryPrompt: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.fetchBooks();
  }

  openModal(): void {
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.fetchBooks();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.fetchBooks();
  }

  fetchBooks(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: { items: any[] } }>('/api/v1/admin/books', { params })
      .subscribe({
        next: (res) => {
          const items = (res.data?.items || []).map((raw) => ({
            id: raw.id,
            title: raw.name || raw.data?.title || 'Untitled Book',
            author: raw.data?.author || 'Unknown Author',
            targetWeek: Number(raw.data?.targetWeek ?? 1),
            readingWindowDays: Number(raw.data?.readingWindowDays ?? 7),
            points: Number(raw.data?.points ?? 50),
            summaryPrompt: raw.data?.summaryPrompt || '',
            status: raw.status || 'draft',
            version: raw.version || 1,
            updatedAt: raw.updatedAt || new Date().toISOString(),
          }));
          this.books.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.books.set([]);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.error?.message || 'Failed to load books.');
        },
      });
  }

  onCreateBook(): void {
    if (this.bookForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.bookForm.value;
    const payload = {
      name: formVal.title,
      data: {
        title: formVal.title,
        author: formVal.author,
        targetWeek: Number(formVal.targetWeek),
        readingWindowDays: Number(formVal.readingWindowDays),
        points: Number(formVal.points),
        summaryPrompt: formVal.summaryPrompt,
      },
    };

    this.http.post('/api/v1/admin/books', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.bookForm.reset({ targetWeek: 1, readingWindowDays: 7, points: 50 });
        this.fetchBooks();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create book entry.');
      },
    });
  }

  publishBook(item: BookItem): void {
    this.http
      .post(`/api/v1/admin/books/${item.id}/publish`, { version: item.version })
      .subscribe({
        next: () => this.fetchBooks(),
        error: (err) => {
          this.errorMessage.set(err.error?.error?.message || 'Failed to publish book entry.');
        },
      });
  }
}
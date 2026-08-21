import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfPageHeader } from '../../../shared/components/design-system';
import { AdminQuartersApiService, DEFAULT_QUARTER_SORT, Quarter } from '../quarters/admin-quarters-api.service';
import { AdminBibleApiService } from './admin-bible-api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfAlert, GfPageHeader],
  template: `
    <gf-page-header title="Upload Bible quiz" eyebrow="Bible Administration">
      <p>Create an import for review before committing a draft content set.</p>
    </gf-page-header>
    <p class="back"><a routerLink="/admin/bible">← Back to Bible content</a></p>
    @if (error(); as failure) {
      <gf-alert title="The quiz could not be uploaded"
        ><p>{{ failure.message }}</p></gf-alert
      >
    }
    @if (submitted() && form.invalid) {
      <div class="error-summary" role="alert">
        <strong>Check the highlighted fields.</strong>
        <ul>
          @if (form.controls.title.invalid) {
            <li><a href="#content-title">Enter a content title.</a></li>
          }
          @if (form.controls.quarterId.invalid) {
            <li><a href="#quarter">Select a quarter.</a></li>
          }
          @if (!questionDocument()) {
            <li><a href="#question-document">Choose a question document.</a></li>
          }
          @if (!answerKeyDocument()) {
            <li><a href="#answer-key-document">Choose an answer-key document.</a></li>
          }
        </ul>
      </div>
    }
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="content-title">Content title</label
      ><input id="content-title" formControlName="title" maxlength="160" /> <label for="quarter">Quarter</label
      ><select id="quarter" formControlName="quarterId" [disabled]="quartersLoading()">
        <option value="">Select a quarter</option>
        @for (quarter of quarters(); track quarter.id) {
          <option [value]="quarter.id">{{ quarter.name }}</option>
        }
      </select>
      @if (quartersLoading()) {
        <p class="quarter-status" role="status">Loading quarters…</p>
      } @else if (quartersError()) {
        <div class="quarter-error" role="alert">
          <span>Quarters could not be loaded.</span>
          <button type="button" (click)="loadQuarters()">Retry</button>
        </div>
      } @else if (quarters().length === 0) {
        <p class="quarter-status" role="status">No quarters are available.</p>
      }
      <section class="file-field">
        <label for="question-document">Question document</label>
        <p>The child-facing questions and answer choices.</p>
        <input
          #questionInput
          id="question-document"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          (change)="selectQuestion($event)"
        />
        @if (questionDocument(); as file) {
          <p class="selected">
            <strong>{{ file.name }}</strong> · {{ fileSize(file.size) }}
            <button type="button" (click)="removeQuestion()">Remove</button>
          </p>
        }
      </section>
      <section class="file-field">
        <label for="answer-key-document">Answer-key document</label>
        <p>The corresponding document with each correct choice underlined.</p>
        <input
          #answerInput
          id="answer-key-document"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          (change)="selectAnswer($event)"
        />
        @if (answerKeyDocument(); as file) {
          <p class="selected">
            <strong>{{ file.name }}</strong> · {{ fileSize(file.size) }}
            <button type="button" (click)="removeAnswer()">Remove</button>
          </p>
        }
      </section>
      @if (sameFile()) {
        <p class="field-error" role="alert">Choose two different documents.</p>
      }
      <div class="actions">
        <a routerLink="/admin/bible">Cancel</a
        ><button
          class="primary"
          type="submit"
          [disabled]="
            uploading() ||
            quartersLoading() ||
            form.invalid ||
            !questionDocument() ||
            !answerKeyDocument() ||
            sameFile()
          "
        >
          {{ uploading() ? 'Uploading…' : 'Upload for review' }}
        </button>
      </div>
    </form>
    <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 48rem;
      }
      .back {
        margin-top: -1rem;
      }
      form {
        display: grid;
        gap: 0.55rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }
      label {
        font-weight: 800;
      }
      input,
      select,
      button {
        min-height: 44px;
        font: inherit;
        border: 1px solid var(--border);
        border-radius: 0.55rem;
        padding: 0.6rem;
      }
      .file-field {
        margin-top: 1rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      .file-field p {
        color: var(--muted);
      }
      .selected {
        padding: 0.7rem;
        background: var(--leaf-soft);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
      }
      .primary {
        background: var(--brand);
        color: #fff;
        font-weight: 700;
      }
      .field-error,
      .error-summary {
        color: #8b1e1e;
      }
      .quarter-status {
        color: var(--muted);
        margin: 0;
      }
      .quarter-error {
        color: #8b1e1e;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .error-summary {
        border-left: 4px solid #8b1e1e;
        padding: 1rem;
        background: #fff1f1;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleImportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminBibleApiService);
  private readonly quartersApi = inject(AdminQuartersApiService);
  private readonly router = inject(Router);
  @ViewChild('questionInput') private questionInput?: ElementRef<HTMLInputElement>;
  @ViewChild('answerInput') private answerInput?: ElementRef<HTMLInputElement>;
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    quarterId: ['', Validators.required],
  });
  readonly quarters = signal<readonly Quarter[]>([]);
  readonly quartersLoading = signal(true);
  readonly quartersError = signal(false);
  readonly questionDocument = signal<File | null>(null);
  readonly answerKeyDocument = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly submitted = signal(false);
  readonly sameFile = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly announcement = signal('');
  private quarterLoadSequence = 0;
  constructor() {
    this.loadQuarters();
  }
  /** Loads every tenant-scoped page; the API remains authoritative for workspace eligibility. */
  loadQuarters() {
    const sequence = ++this.quarterLoadSequence;
    this.quartersLoading.set(true);
    this.quartersError.set(false);
    this.loadQuarterPage(sequence, 1, []);
  }
  private loadQuarterPage(sequence: number, page: number, loaded: readonly Quarter[]) {
    this.quartersApi.list({ page, pageSize: 100, sort: DEFAULT_QUARTER_SORT }).subscribe({
      next: (result) => {
        if (sequence !== this.quarterLoadSequence) return;
        const quarters = [...loaded, ...result.items];
        if (page < result.pagination.totalPages) {
          this.loadQuarterPage(sequence, page + 1, quarters);
          return;
        }
        this.quarters.set(quarters);
        this.quartersLoading.set(false);
      },
      error: () => {
        if (sequence !== this.quarterLoadSequence) return;
        this.quartersLoading.set(false);
        this.quartersError.set(true);
      },
    });
  }
  selectQuestion(event: Event) {
    this.questionDocument.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.checkFiles();
  }
  selectAnswer(event: Event) {
    this.answerKeyDocument.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.checkFiles();
  }
  removeQuestion() {
    this.questionDocument.set(null);
    if (this.questionInput) this.questionInput.nativeElement.value = '';
    this.checkFiles();
  }
  removeAnswer() {
    this.answerKeyDocument.set(null);
    if (this.answerInput) this.answerInput.nativeElement.value = '';
    this.checkFiles();
  }
  private checkFiles() {
    const a = this.questionDocument(),
      b = this.answerKeyDocument();
    this.sameFile.set(!!a && !!b && a.name === b.name && a.size === b.size && a.lastModified === b.lastModified);
  }
  submit() {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.checkFiles();
    const question = this.questionDocument(),
      answer = this.answerKeyDocument();
    if (this.form.invalid || !question || !answer || this.sameFile() || this.uploading()) return;
    const value = this.form.getRawValue();
    this.uploading.set(true);
    this.error.set(null);
    this.announcement.set('Uploading Bible quiz.');
    this.api
      .createImport(value.title.trim(), value.quarterId, question, answer)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (created) => {
          this.announcement.set('Upload complete. Opening import review.');
          void this.router.navigate(['/admin/bible/imports', created.id]);
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.announcement.set('The Bible quiz could not be uploaded.');
        },
      });
  }
  fileSize(bytes: number) {
    return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

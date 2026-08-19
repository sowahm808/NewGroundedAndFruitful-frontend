import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfCard, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { ChildApi, newIdempotencyKey, ReadingSummary, validatePrivateMedia } from './child-api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfCard, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Quarter reading" eyebrow="Read and respond" />
    @if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (loading()) {
      <p role="status">Loading reading assignment…</p>
    } @else if (data(); as d) {
      @if (!d.book) {
        <gf-empty-state title="No quarter book configured" message="A book has not been assigned for this quarter." />
      } @else {
        <gf-card
          ><h2>{{ d.book.title }}</h2>
          @if (d.book.author) {
            <p>By {{ d.book.author }}</p>
          }
          <p>{{ d.book.description }}</p></gf-card
        >
        <div class="stack">
          @for (a of d.assignments; track a.id) {
            <gf-card
              ><h2>Week {{ a.week }}: {{ a.title }}</h2>
              <p>{{ a.instructions }}</p>
              @if (a.responses.length) {
                <h3>Prior responses</h3>
                <ul>
                  @for (r of a.responses; track r.id) {
                    <li>
                      <time [attr.datetime]="r.submittedAt">{{ r.submittedAt }}</time> {{ r.text }}
                    </li>
                  }
                </ul>
              }
              @if (a.status !== 'completed' && a.status !== 'locked') {
                <label class="field" [for]="'reading-' + a.id"
                  ><span>Weekly reflection</span
                  ><textarea [id]="'reading-' + a.id" [formControl]="reflection"></textarea>
                </label>
                @if (a.media) {
                  <label class="field"
                    ><span>Optional private audio or video</span
                    ><input
                      type="file"
                      [accept]="a.media.allowedMimeTypes.join(',')"
                      (change)="chooseMedia($event, a.media)"
                  /></label>
                  <p class="muted">
                    Media is uploaded only through a backend-authorized private target. It does not autoplay.
                  </p>
                }
                <button [disabled]="reflection.invalid || mediaError() !== null" (click)="submit(a.id)">
                  Submit reflection
                </button>
              }
            </gf-card>
          }
        </div>
      }
    }
    <p class="error">{{ mediaError() }}</p>
    <p role="status" aria-live="polite">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingComponent implements OnInit {
  private api = inject(ChildApi);
  readonly data = signal<ReadingSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly mediaError = signal<string | null>(null);
  readonly reflection = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(5000)],
  });
  ngOnInit() {
    this.load();
  }
  load() {
    this.api.reading().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Reading could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  chooseMedia(event: Event, policy: NonNullable<ReadingSummary['assignments'][number]['media']>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    this.mediaError.set(
      validatePrivateMedia(input.files[0], policy) ??
        'Private media upload requires the backend upload-target contract. Use text for now.',
    );
  }
  submit(id: string) {
    this.api.submitReading(id, { text: this.reflection.value }, newIdempotencyKey()).subscribe({
      next: () => {
        this.reflection.reset();
        this.message.set('Reading reflection submitted.');
        this.load();
      },
      error: (e) => this.message.set(e instanceof ApiError ? e.message : 'Reflection could not be submitted.'),
    });
  }
}

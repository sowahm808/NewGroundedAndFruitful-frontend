import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { ChildApi, GratitudeEntry, newIdempotencyKey } from './child-api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Gratitude" eyebrow="Private"
      ><p>Write something you are thankful for. Your entries are not shared with your team.</p></gf-page-header
    >
    <form (ngSubmit)="submit()">
      <label class="field" for="gratitude"
        ><span>Today's gratitude</span><textarea id="gratitude" [formControl]="text"></textarea></label
      ><button [disabled]="text.invalid || busy()">Save gratitude</button>
    </form>
    <p aria-live="polite" role="status">{{ message() }}</p>
    <h2>Your history</h2>
    @if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (loading()) {
      <p role="status">Loading your private gratitude history…</p>
    } @else if (!entries().length) {
      <gf-empty-state title="No gratitude entries yet" message="Your entries will appear here after you submit one." />
    } @else {
      <ul>
        @for (entry of entries(); track entry.id) {
          <li>
            <time [attr.datetime]="entry.localDate">{{ entry.localDate }}</time
            >: {{ entry.text }}
          </li>
        }
      </ul>
      @if (nextCursor()) {
        <button class="secondary" (click)="load(nextCursor()!)">Load more</button>
      }
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GratitudeComponent implements OnInit {
  private api = inject(ChildApi);
  readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });
  readonly entries = signal<readonly GratitudeEntry[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  private key = newIdempotencyKey();
  ngOnInit() {
    this.load();
  }
  load(cursor = '') {
    this.loading.set(true);
    this.error.set(null);
    this.api.gratitude(cursor).subscribe({
      next: (p) => {
        this.entries.update((items) => (cursor ? [...items, ...p.items] : p.items));
        this.nextCursor.set(p.nextCursor ?? null);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'History could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  submit() {
    if (this.text.invalid || this.busy()) return;
    this.busy.set(true);
    this.api.submitGratitude(this.text.value, this.key).subscribe({
      next: (e) => {
        this.entries.update((x) => [e, ...x.filter((i) => i.id !== e.id)]);
        this.text.reset();
        this.key = newIdempotencyKey();
        this.message.set('Gratitude saved.');
        this.busy.set(false);
      },
      error: (e) => {
        this.message.set(
          e instanceof ApiError && e.status === 409
            ? 'A gratitude entry already exists for today.'
            : e instanceof ApiError
              ? e.message
              : 'Gratitude could not be saved.',
        );
        this.busy.set(false);
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfCard, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { BibleActivity, ChildApi, newIdempotencyKey } from './child-api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfCard, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Bible activities" eyebrow="Learn and reflect"
      ><p>Participation credit comes from completing an activity—not from getting an answer correct.</p></gf-page-header
    >
    @if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (loading()) {
      <p role="status">Loading Bible activities…</p>
    } @else if (!activities().length) {
      <gf-empty-state title="No Bible activity configured" message="No activity is available right now." />
    } @else {
      <div class="stack">
        @for (a of activities(); track a.id) {
          <gf-card
            ><h2>{{ a.title }}</h2>
            <p>{{ a.prompt }}</p>
            @switch (a.type) {
              @case ('reading') {
                <blockquote>{{ a.passage }}</blockquote>
                <button (click)="submit(a, true)">Mark reading complete</button>
              }
              @case ('reflection') {
                <label class="field"><span>Your reflection</span><textarea [formControl]="text"></textarea></label
                ><button [disabled]="text.invalid" (click)="submit(a, text.value)">Submit reflection</button>
              }
              @case ('memory_verse') {
                <blockquote>{{ a.verse }}</blockquote>
                <label class="field"
                  ><span>What helps you remember this verse?</span><textarea [formControl]="text"></textarea></label
                ><button [disabled]="text.invalid" (click)="submit(a, text.value)">Complete</button>
              }
              @case ('true_false') {
                <p>{{ a.statement }}</p>
                <div class="actions">
                  <button (click)="submit(a, true)">True</button><button (click)="submit(a, false)">False</button>
                </div>
              }
              @case ('multiple_choice') {
                @for (c of a.choices; track c.id) {
                  <button class="secondary" (click)="submit(a, c.id)">{{ c.label }}</button>
                }
              }
            }
          </gf-card>
        }
      </div>
    }
    <p role="status" aria-live="polite">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BibleComponent implements OnInit {
  private api = inject(ChildApi);
  readonly activities = signal<readonly BibleActivity[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(3000)],
  });
  private keys = new Map<string, string>();
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.bible().subscribe({
      next: (a) => {
        this.activities.set(a);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Bible activities could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  submit(a: BibleActivity, response: string | boolean) {
    if (a.status === 'completed' || a.status === 'locked') return;
    const key = this.keys.get(a.id) ?? newIdempotencyKey();
    this.keys.set(a.id, key);
    this.api.submitBible(a.id, { response, final: true }, key).subscribe({
      next: (r) => {
        this.message.set(
          `Activity complete.${r.learningFeedback ? ' Learning feedback: ' + r.learningFeedback : ''}${r.participationAward ? ' ' + r.participationAward.label : ''}`,
        );
        this.activities.update((all) => all.map((x) => (x.id === a.id ? { ...x, status: 'completed' } : x)));
        this.keys.delete(a.id);
      },
      error: (e) => this.message.set(e instanceof ApiError ? e.message : 'The response could not be saved.'),
    });
  }
}

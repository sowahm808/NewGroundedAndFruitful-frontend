import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import {
  CharacterCycle,
  CharacterQuality,
  CharacterResponse,
  CharacterResult,
  ChildApi,
  newIdempotencyKey,
} from './child-api.service';
type ResponseForm = FormGroup<{
  qualityId: FormControl<string>;
  rating: FormControl<number | null>;
  reflection: FormControl<string>;
}>;
export const CHARACTER_PARTICIPATION_COPY =
  'Points are awarded for completing the reflection. A rating of 0 and a rating of 10 earn the same participation credit.';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Character reflection" eyebrow="Grow with honesty"
      ><p>{{ copy }}</p></gf-page-header
    >
    @if (loading()) {
      <p role="status">Loading active qualities…</p>
    } @else if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (!cycle()?.qualities?.length) {
      <gf-empty-state
        title="No character activity configured"
        message="There are no active qualities to reflect on right now."
      />
    } @else if (cycle()?.status === 'completed' || cycle()?.status === 'locked') {
      <gf-empty-state
        title="Reflection complete"
        message="Your character reflection has been completed for this cycle."
      />
    } @else {
      <form [formGroup]="form" (ngSubmit)="complete()">
        <div formArrayName="responses" class="stack">
          @for (group of responses.controls; track group.controls.qualityId.value; let i = $index) {
            <fieldset [formGroupName]="i">
              <legend>
                <strong>{{ quality(group.controls.qualityId.value)?.name }}</strong>
              </legend>
              <p>{{ quality(group.controls.qualityId.value)?.description }}</p>
              <p id="scale-{{ i }}">
                Choose 0 for “not yet” through 10 for “consistently.” No rating earns more credit than another.
              </p>
              <div class="rating" role="radiogroup" [attr.aria-describedby]="'scale-' + i">
                @for (value of ratings; track value) {
                  <label
                    ><input type="radio" formControlName="rating" [value]="value" /><span>{{ value }}</span></label
                  >
                }
              </div>
              <p aria-live="polite">
                Current selection:
                {{ group.controls.rating.value === null ? 'unanswered' : group.controls.rating.value }}
              </p>
              <label class="field" [for]="'reflection-' + i"
                ><span>Optional reflection</span
                ><textarea [id]="'reflection-' + i" formControlName="reflection"></textarea>
              </label>
              @if (group.controls.rating.invalid && group.controls.rating.touched) {
                <p class="error">Choose a rating before completing.</p>
              }
            </fieldset>
          }
        </div>
        <div class="actions">
          <button type="button" class="secondary" [disabled]="busy()" (click)="draft()">Save draft</button
          ><button type="submit" [disabled]="busy()">Complete all reflections</button>
        </div>
      </form>
    }
    <p role="status" aria-live="polite">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterComponent implements OnInit {
  private api = inject(ChildApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly copy = CHARACTER_PARTICIPATION_COPY;
  readonly ratings = Array.from({ length: 11 }, (_, i) => i);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly cycle = signal<CharacterCycle | null>(null);
  private key = newIdempotencyKey();
  readonly form = new FormGroup({ responses: new FormArray<ResponseForm>([]) });
  get responses() {
    return this.form.controls.responses;
  }
  ngOnInit() {
    this.load();
  }
  quality(id: string): CharacterQuality | undefined {
    return this.cycle()?.qualities.find((q) => q.id === id);
  }
  load() {
    this.loading.set(true);
    this.api.character().subscribe({
      next: (c) => {
        this.cycle.set(c);
        this.responses.clear();
        const unique = new Set<string>();
        for (const q of c.qualities) {
          if (unique.has(q.id)) continue;
          unique.add(q.id);
          const saved = c.responses.find((r) => r.qualityId === q.id);
          this.responses.push(
            new FormGroup({
              qualityId: new FormControl(q.id, { nonNullable: true }),
              rating: new FormControl<number | null>(saved?.rating ?? null, [
                Validators.required,
                Validators.min(0),
                Validators.max(10),
              ]),
              reflection: new FormControl(saved?.reflection ?? '', {
                nonNullable: true,
                validators: [Validators.maxLength(2000)],
              }),
            }),
          );
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Character qualities could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  draft() {
    this.send(false);
  }
  complete() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.send(true);
  }
  private send(final: boolean) {
    const c = this.cycle();
    if (!c || this.busy()) return;
    const responses = this.responses.controls
      .filter((g) => g.controls.rating.value !== null)
      .map((g) => ({
        qualityId: g.controls.qualityId.value,
        rating: g.controls.rating.value!,
        reflection: g.controls.reflection.value || undefined,
      }));
    this.busy.set(true);
    if (final) {
      this.submitCompletion(responses, c.version);
      return;
    }
    this.saveDraft(responses, c.version);
  }
  private saveDraft(responses: readonly CharacterResponse[], version: number) {
    this.api
      .saveCharacter(responses, version)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (cycle: CharacterCycle) => {
          this.message.set('Draft saved.');
          this.cycle.set(cycle);
        },
        error: (error: unknown) => this.showSaveError(error),
      });
  }
  private submitCompletion(responses: readonly CharacterResponse[], version: number) {
    this.api
      .completeCharacter(responses, version, this.key)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result: CharacterResult) => {
          this.message.set(
            `Reflection complete.${result.participationAward ? ' ' + result.participationAward.label : ''}`,
          );
          this.cycle.update((cycle) => (cycle ? { ...cycle, status: 'completed' } : cycle));
          this.key = newIdempotencyKey();
        },
        error: (error: unknown) => this.showSaveError(error),
      });
  }
  private showSaveError(error: unknown) {
    this.message.set(error instanceof ApiError ? error.message : 'The reflection could not be saved.');
  }
}

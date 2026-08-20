import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  GfAlert,
  GfButton,
  GfCard,
  GfEmptyState,
  GfLoading,
  GfPageHeader,
} from '../../shared/components/design-system';
import { ObserverApi, ObserverGrant, ObserverObservation } from './observer-api.service';
import { ApiError } from '../../core/http/api-error';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfButton, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Positive observations" eyebrow="Observer"
      ><p>
        Recognize growth for participants your program has explicitly permitted. This is not a participant search.
      </p></gf-page-header
    >
    @if (loading()) {
      <gf-loading />
    } @else {
      @if (!grants().length) {
        <gf-empty-state
          title="No participant permissions"
          message="A program administrator must grant access before you can submit an observation."
        />
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label
            >Permitted participant<select formControlName="participantId" required>
              <option value="">Choose from your permissions</option>
              @for (g of grants(); track g.participantId) {
                <option [value]="g.participantId">{{ g.displayName }}</option>
              }
            </select></label
          ><label>Positive observation<textarea formControlName="summary" maxlength="1000" required></textarea></label
          ><gf-button type="submit" [disabled]="form.invalid || submitting()">{{
            submitting() ? 'Submitting…' : 'Submit for moderation'
          }}</gf-button>
        </form>
      }
      <h2>Your submission history</h2>
      @if (!items().length) {
        <gf-empty-state title="No observations yet" message="Your submitted observations will appear here." />
      }
      <div class="cards">
        @for (item of items(); track item.id) {
          <gf-card
            ><h3>{{ item.participantName }}</h3>
            <p>{{ item.summary }}</p>
            <p><strong>Moderation status:</strong> {{ item.moderationStatus }}</p>
            <p class="meta">Submitted {{ item.submittedAt }}</p></gf-card
          >
        }
      </div>
    }
    @if (confirmation()) {
      <p role="status">Observation submitted for moderation.</p>
    }
    @if (error()) {
      <gf-alert title="Observations unavailable"
        ><p>{{ error() }}</p></gf-alert
      >
    }`,
  styles: [
    `
      .cards {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
      }
      form {
        display: grid;
        gap: 1rem;
        max-width: 44rem;
        margin-bottom: 2rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-weight: 700;
      }
      select,
      textarea {
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 0.75rem;
        font: inherit;
      }
      textarea {
        min-height: 8rem;
      }
      .meta {
        color: var(--muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObserverObservationsComponent {
  private api = inject(ObserverApi);
  private destroy = inject(DestroyRef);
  readonly grants = signal<readonly ObserverGrant[]>([]);
  readonly items = signal<readonly ObserverObservation[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly confirmation = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    participantId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] }),
  });
  constructor() {
    forkJoin({ grants: this.api.grants(), items: this.api.observations() })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.grants.set(v.grants);
          this.items.set(v.items);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(this.message(e));
          this.loading.set(false);
        },
      });
  }
  submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.confirmation.set(false);
    this.api
      .submit({
        participantId: this.form.controls.participantId.value,
        summary: this.form.controls.summary.value.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (item) => {
          this.items.update((v) => [item, ...v]);
          this.form.controls.summary.reset();
          this.submitting.set(false);
          this.confirmation.set(true);
        },
        error: (e) => {
          this.error.set(this.message(e));
          this.submitting.set(false);
        },
      });
  }
  private message(e: unknown) {
    return e instanceof ApiError ? e.message : 'We could not load the observer view. Please try again.';
  }
}

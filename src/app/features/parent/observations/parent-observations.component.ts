import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  GfAlert,
  GfButton,
  GfCard,
  GfEmptyState,
  GfLoading,
  GfPageHeader,
} from '../../../shared/components/design-system';
import { Observation, ParentApi } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
@Component({
  standalone: true,
  imports: [
    ParentChildScopeComponent,
    ReactiveFormsModule,
    GfAlert,
    GfButton,
    GfCard,
    GfEmptyState,
    GfLoading,
    GfPageHeader,
  ],
  template: `<gf-page-header title="Positive observations" eyebrow="Notice growth"
      ><p>
        Submit an observation for an authorized linked child. For an immediate safeguarding concern, contact your
        program safeguarding lead or emergency services.
      </p></gf-page-header
    >
    <gf-parent-child-scope (childChange)="selectChild($event)" />
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label>Observation<textarea formControlName="summary" maxlength="1000" required></textarea></label
      ><gf-button type="submit" [disabled]="form.invalid || !childId() || submitting()">{{
        submitting() ? 'Submitting…' : 'Submit observation'
      }}</gf-button>
    </form>
    @if (confirmation()) {
      <p role="status">Observation submitted for review.</p>
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
      </gf-alert>
    }
    @if (loading()) {
      <gf-loading />
    } @else if (!items().length) {
      <gf-empty-state title="No observations yet" message="Submitted observations will appear here." />
    }
    <div class="cards">
      @for (item of items(); track item.id) {
        <gf-card
          ><h2>{{ item.summary }}</h2>
          <p><strong>Moderation status:</strong> {{ item.status }}</p>
          <p>{{ item.submittedAt }}</p></gf-card
        >
      }
    </div>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentObservationsComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = signal('');
  readonly form = new FormGroup({
    summary: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] }),
  });
  readonly items = signal<readonly Observation[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly confirmation = signal(false);
  readonly error = signal<ViewError | null>(null);
  reload(childId = this.childId()) {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .observations(childId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (p) => {
          this.items.set(Array.isArray(p.items) ? p.items : []);
        },
        error: (e) => {
          this.items.set([]);
          this.error.set(parentViewError(e));
        },
      });
  }
  selectChild(id: string) {
    this.childId.set(id);
    this.items.set([]);
    if (id) this.reload(id);
    else this.loading.set(false);
  }
  submit() {
    if (this.form.invalid || !this.childId() || this.submitting()) return;
    this.submitting.set(true);
    this.confirmation.set(false);
    this.api
      .submitObservation({ childId: this.childId(), summary: this.form.controls.summary.value.trim() })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (o) => {
          this.items.update((v) => [o, ...v]);
          this.form.controls.summary.reset();
          this.submitting.set(false);
          this.confirmation.set(true);
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.submitting.set(false);
        },
      });
  }
}

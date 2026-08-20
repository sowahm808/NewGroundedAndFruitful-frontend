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
} from '../../../shared/components/design-system';
import { ParentApi, SupportRequest } from '../parent-api.service';
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
  template: `<gf-page-header title="Academic support" eyebrow="Help with dignity"
      ><p>Create and track authorized support requests.</p></gf-page-header
    >
    <gf-parent-child-scope (childChange)="childId.set($event)" />
    @if (loading()) {
      <gf-loading />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
      </gf-alert>
    }
    @if (!loading()) {
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label
          >Category<select formControlName="categoryId" required>
            <option value="">Choose a category</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.id">{{ c.label }}</option>
            }
          </select></label
        ><label>What support is needed?<textarea formControlName="summary" maxlength="1000" required></textarea></label
        ><gf-button type="submit" [disabled]="form.invalid || !childId() || submitting()">{{
          submitting() ? 'Sending…' : 'Request support'
        }}</gf-button>
      </form>
      @if (!items().length) {
        <gf-empty-state title="No support requests" message="Your request history will appear here." />
      }
      <div class="cards">
        @for (r of items(); track r.id) {
          <gf-card
            ><h2>{{ r.category }}</h2>
            <p>{{ r.summary }}</p>
            <p>Status: {{ r.status }}</p></gf-card
          >
        }
      </div>
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentAcademicSupportComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = signal('');
  readonly form = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] }),
  });
  readonly categories = signal<readonly { readonly id: string; readonly label: string }[]>([]);
  readonly items = signal<readonly SupportRequest[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<ViewError | null>(null);
  constructor() {
    forkJoin({ config: this.api.supportConfiguration(), requests: this.api.supportRequests() })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.categories.set(v.config.categories);
          this.items.set(v.requests.items);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(parentViewError(e, true));
          this.loading.set(false);
        },
      });
  }
  submit() {
    if (this.form.invalid || !this.childId() || this.submitting()) return;
    this.submitting.set(true);
    this.api
      .createSupport({
        childId: this.childId(),
        categoryId: this.form.controls.categoryId.value,
        summary: this.form.controls.summary.value.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.items.update((v) => [r, ...v]);
          this.form.controls.summary.reset();
          this.submitting.set(false);
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.submitting.set(false);
        },
      });
  }
}

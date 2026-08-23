import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  GfAlert,
  GfButton,
  GfCard,
  GfEmptyState,
  GfLoading,
  GfPageHeader,
} from '../../shared/components/design-system';
import { MentorApi, MentorReview } from './mentor-api.service';
import { MentorViewError, mentorViewError } from './mentor-view.utilities';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfButton, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Project summaries and guidance" eyebrow="Mentor"
      ><p>Review approved project summaries and offer constructive next steps.</p></gf-page-header
    >
    @if (loading()) {
      <gf-loading />
    } @else if (!items().length) {
      <gf-empty-state title="No project summaries" message="Project updates will appear here." />
    }
    <div class="cards">
      @for (item of items(); track item.id) {
        <gf-card
          ><h2>{{ item.participantName }}</h2>
          <p>{{ item.summary }}</p>
          <p><strong>Status:</strong> {{ item.status }}</p>
          @for (milestone of item.milestones ?? []; track milestone.id) {
            <section class="milestone">
              <h3>{{ milestone.title }}</h3>
              <p><strong>Milestone status:</strong> {{ milestone.status }}</p>
              @if (milestone.feedback) {
                <p>{{ milestone.feedback }}</p>
              }
              <label>Milestone feedback<textarea #feedback maxlength="1000"></textarea></label>
              <gf-button
                type="button"
                [disabled]="submitting() || !feedback.value.trim()"
                (click)="submitMilestone(item.id, milestone.id, feedback.value); feedback.value = ''"
                >Send milestone feedback</gf-button
              >
            </section>
          }
          <form [formGroup]="form" (ngSubmit)="submit(item.id)">
            <label>Guidance<textarea formControlName="guidance" maxlength="1000" required></textarea></label
            ><gf-button type="submit" [disabled]="form.invalid || submitting()">{{
              submitting() ? 'Sending…' : 'Send guidance'
            }}</gf-button>
          </form></gf-card
        >
      }
    </div>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (error(); as e) {
      <gf-alert title="Projects unavailable"
        ><p>{{ e.message }}</p></gf-alert
      >
    }`,
  styleUrl: './mentor-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorProjectsComponent {
  private api = inject(MentorApi);
  private destroy = inject(DestroyRef);
  readonly items = signal<readonly MentorReview[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly message = signal('');
  readonly error = signal<MentorViewError | null>(null);
  readonly form = new FormGroup({
    guidance: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] }),
  });
  constructor() {
    this.api
      .projects()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.items.set(v);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.loading.set(false);
        },
      });
  }
  submit(id: string) {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.api
      .addGuidance(id, this.form.controls.guidance.value.trim())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.items.update((items) => items.map((i) => (i.id === v.id ? v : i)));
          this.form.reset();
          this.submitting.set(false);
          this.message.set('Guidance sent for the participant.');
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.submitting.set(false);
        },
      });
  }
  submitMilestone(reviewId: string, milestoneId: string, feedback: string) {
    const value = feedback.trim();
    if (!value || this.submitting()) return;
    this.submitting.set(true);
    this.api
      .addMilestoneFeedback(reviewId, milestoneId, value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (updated) => {
          this.items.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          this.submitting.set(false);
          this.message.set('Milestone feedback sent.');
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.submitting.set(false);
        },
      });
  }
}

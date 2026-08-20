import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfButton, GfEmptyState, GfLoading, GfPageHeader } from '../../shared/components/design-system';
import { MentorApi, MentorRecipient } from './mentor-api.service';
import { MentorViewError, mentorViewError } from './mentor-view.utilities';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfButton, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Send encouragement" eyebrow="Mentor"
      ><p>Share a positive, program-appropriate message with an assigned participant.</p></gf-page-header
    >
    @if (loading()) {
      <gf-loading />
    } @else if (!recipients().length) {
      <gf-empty-state
        title="No available recipients"
        message="Only participants authorized by the program appear here."
      />
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label
          >Participant<select formControlName="participantId" required>
            <option value="">Choose a participant</option>
            @for (p of recipients(); track p.id) {
              <option [value]="p.id">{{ p.displayName }} — {{ p.teamName }}</option>
            }
          </select></label
        ><label>Encouragement<textarea formControlName="message" maxlength="500" required></textarea></label
        ><gf-button type="submit" [disabled]="form.invalid || submitting()">{{
          submitting() ? 'Sending…' : 'Send encouragement'
        }}</gf-button>
      </form>
    }
    @if (sent()) {
      <p role="status">Encouragement sent.</p>
    }
    @if (error(); as e) {
      <gf-alert title="Encouragement unavailable"
        ><p>{{ e.message }}</p></gf-alert
      >
    }`,
  styleUrl: './mentor-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorEncouragementComponent {
  private api = inject(MentorApi);
  private destroy = inject(DestroyRef);
  readonly recipients = signal<readonly MentorRecipient[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly error = signal<MentorViewError | null>(null);
  readonly form = new FormGroup({
    participantId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
  });
  constructor() {
    this.api
      .encouragementRecipients()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.recipients.set(v);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.loading.set(false);
        },
      });
  }
  submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.sent.set(false);
    this.api
      .encourage(this.form.controls.participantId.value, this.form.controls.message.value.trim())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.form.controls.message.reset();
          this.submitting.set(false);
          this.sent.set(true);
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.submitting.set(false);
        },
      });
  }
}

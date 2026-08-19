import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { CheckIn, ChildApi, newIdempotencyKey } from './child-api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Private check-in" eyebrow="Today"
      ><p>Only authorized people can access these answers. They are never shown in the team view.</p></gf-page-header
    >
    @if (loading()) {
      <p role="status">Loading your check-in…</p>
    } @else if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (record()?.status === 'completed' || record()?.status === 'locked') {
      <gf-empty-state title="Check-in complete" message="Your private check-in is locked for today." />
    } @else {
      <form [formGroup]="form" (ngSubmit)="complete()">
        <label class="field" for="feelings"
          ><span>How does your heart feel today?</span
          ><input id="feelings" formControlName="feelings" autocomplete="off" /></label
        ><label class="field" for="mind"
          ><span>What is on your mind?</span><textarea id="mind" formControlName="mind"></textarea></label
        ><label class="field" for="note"
          ><span>Private note (optional)</span><textarea id="note" formControlName="privateNote"></textarea>
        </label>
        <div class="actions">
          <button class="secondary" type="button" [disabled]="busy()" (click)="saveDraft()">Save draft</button
          ><button type="submit" [disabled]="busy() || form.invalid">Complete check-in</button>
        </div>
      </form>
    }
    <p role="status" aria-live="polite">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckInComponent implements OnInit {
  private api = inject(ChildApi);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly record = signal<CheckIn | null>(null);
  private key = newIdempotencyKey();
  readonly form = new FormGroup({
    feelings: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    mind: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] }),
    privateNote: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.checkIn().subscribe({
      next: (r) => {
        this.record.set(r);
        this.form.patchValue({ feelings: r.feelings ?? '', mind: r.mind ?? '', privateNote: r.privateNote ?? '' });
        this.loading.set(false);
      },
      error: (e) => this.fail(e),
    });
  }
  saveDraft() {
    this.send(false);
  }
  complete() {
    if (this.form.invalid || !confirm('Completing may lock editing. Are you ready to finish?')) return;
    this.send(true);
  }
  private send(final: boolean) {
    const r = this.record();
    if (!r || this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    const v = this.form.getRawValue();
    const command = { ...v, privateNote: v.privateNote || undefined, version: r.version };
    (final ? this.api.completeCheckIn(command, this.key) : this.api.saveCheckIn(command)).subscribe({
      next: (x) => {
        this.record.set(x);
        this.busy.set(false);
        this.message.set(final ? 'Check-in complete.' : 'Draft saved.');
        if (final) this.key = newIdempotencyKey();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e instanceof ApiError ? e.message : 'The check-in could not be saved.');
      },
    });
  }
  private fail(e: unknown) {
    this.error.set(e instanceof ApiError ? e.message : 'The check-in could not be loaded.');
    this.loading.set(false);
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService } from '../../core/auth/auth.service';
import { GfButton, GfCard } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a class="logo" routerLink="/auth/login">Grounded &amp; Fruitful</a>
    <gf-card>
      <p class="eyebrow">Account recovery</p><h1>Reset your password</h1>
      <p>Enter your email address. If it belongs to an account, Firebase will send password-reset instructions.</p>
      @if (!sent()) {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="reset-email">Email address</label>
          <input id="reset-email" type="email" formControlName="email" autocomplete="email"
            [attr.aria-invalid]="showEmailError()" [attr.aria-describedby]="showEmailError() ? 'email-error' : null" />
          @if (showEmailError()) { <p id="email-error" class="field-error">Enter a valid email address.</p> }
          <gf-button type="submit" [disabled]="busy()">{{ busy() ? 'Sending…' : 'Send reset link' }}</gf-button>
        </form>
      } @else {
        <p class="message" role="status">Check your email for a password-reset link. You can close this page safely.</p>
      }
      @if (message()) { <p class="message" role="alert">{{ message() }}</p> }
      <a routerLink="/auth/login">Back to sign in</a>
    </gf-card>
  </main>`,
  styleUrls: ['./auth-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetComponent {
  private readonly auth = inject(AuthService);
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly message = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  readonly showEmailError = () => this.form.controls.email.invalid && this.form.controls.email.touched;

  async submit(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.message.set('');
    try {
      await this.auth.sendPasswordReset(this.form.controls.email.value.trim());
      this.sent.set(true);
    } catch (error) {
      this.message.set(passwordResetErrorMessage(error));
    } finally { this.busy.set(false); }
  }
}

export function passwordResetErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === 'auth/network-request-failed')
    return 'Check your connection and try again.';
  if (error instanceof FirebaseError && error.code === 'auth/too-many-requests')
    return 'Too many requests were made. Please wait before trying again.';
  // Do not disclose whether an address is registered.
  return 'We could not send the reset email. Please try again.';
}

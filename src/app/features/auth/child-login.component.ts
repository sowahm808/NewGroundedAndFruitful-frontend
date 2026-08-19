import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService } from '../../core/auth/auth.service';
import { ChildAuthRepository } from '../../core/auth/child-auth.repository';
import { ApiError } from '../../core/http/api-error';
import { GfButton, GfCard } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a routerLink="/auth/login">← Adult sign in</a>
    <gf-card><p class="eyebrow">Child-safe access</p><h1>Ready to grow?</h1>
      @if (message()) { <p class="message" [attr.role]="messageRole()">{{ message() }}</p> }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate aria-describedby="child-login-help">
        <p id="child-login-help">Ask your parent or program leader if you do not know these details.</p>
        <label for="family-code">Family code</label>
        <input id="family-code" formControlName="familyCode" autocomplete="off" autocapitalize="characters"
          [attr.aria-invalid]="invalid('familyCode')" [attr.aria-describedby]="invalid('familyCode') ? 'family-code-error' : null" />
        @if (invalid('familyCode')) { <p id="family-code-error" class="field-error">Enter your family code.</p> }
        <label for="child-handle">Your handle</label>
        <input id="child-handle" formControlName="handle" autocomplete="username"
          [attr.aria-invalid]="invalid('handle')" [attr.aria-describedby]="invalid('handle') ? 'handle-error' : null" />
        @if (invalid('handle')) { <p id="handle-error" class="field-error">Enter your handle.</p> }
        <label for="child-pin">PIN</label>
        <input id="child-pin" type="password" inputmode="numeric" formControlName="pin" autocomplete="current-password"
          [attr.aria-invalid]="invalid('pin')" [attr.aria-describedby]="invalid('pin') ? 'pin-error' : null" />
        @if (invalid('pin')) { <p id="pin-error" class="field-error">Enter your 4–8 digit PIN.</p> }
        <gf-button type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : "Let's go" }}</gf-button>
      </form>
    </gf-card>
  </main>`,
  styleUrls: ['./auth-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLoginComponent {
  private readonly repository = inject(ChildAuthRepository);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly message = signal('');
  readonly messageRole = signal<'alert' | 'status'>('status');
  readonly busy = signal(false);
  readonly form = new FormGroup({
    familyCode: new FormControl('', { nonNullable: true, validators: Validators.required }),
    handle: new FormControl('', { nonNullable: true, validators: Validators.required }),
    pin: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4,8}$/)] }),
  });

  invalid(name: keyof ChildLoginComponent['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.message.set('');
    try {
      const customToken = await this.repository.exchange({
        familyCode: this.form.controls.familyCode.value.trim(),
        handle: this.form.controls.handle.value.trim(),
        pin: this.form.controls.pin.value,
      });
      const user = await this.auth.signInChild(customToken);
      if (!user.roles.includes('child')) {
        await this.auth.logout();
        throw new Error('invalid-child-role');
      }
      await this.router.navigateByUrl('/child/today');
    } catch (error) {
      this.messageRole.set('alert');
      this.message.set(childLoginErrorMessage(error));
    } finally {
      // A PIN is short-lived sensitive material: remove it after success or failure.
      this.form.controls.pin.reset();
      this.busy.set(false);
    }
  }
}

export function childLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    const wait = error.retryAfterSeconds ? ` Try again in ${error.retryAfterSeconds} seconds.` : ' Please wait and try again.';
    return `Too many sign-in attempts.${wait}`;
  }
  if (error instanceof ApiError && error.status === 0) return 'We cannot reach sign-in right now. Check your connection.';
  if (error instanceof FirebaseError && error.code === 'auth/network-request-failed')
    return 'We cannot reach sign-in right now. Check your connection.';
  return 'Those sign-in details did not work. Check them with a parent or program leader.';
}

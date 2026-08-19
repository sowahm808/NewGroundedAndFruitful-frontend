import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService } from '../../core/auth/auth.service';
import { roleDestination } from '../../core/auth/role.utilities';
import { SessionUser } from '../../core/models/domain.models';
import { GfButton, GfCard } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a class="logo" routerLink="/">Grounded &amp; Fruitful</a
    ><gf-card>
      <p class="eyebrow">Join the journey</p>
      <h1>Create your account</h1>
      <p>Set up an adult account for your family or program.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Full name<input formControlName="name" autocomplete="name" /></label>
        <label>Email address<input type="email" formControlName="email" autocomplete="email" /></label>
        <label>Password<input type="password" formControlName="password" autocomplete="new-password" /></label>
        <small>Use at least 8 characters.</small>
        <gf-button type="submit" [disabled]="form.invalid || busy()">{{
          busy() ? 'Creating account…' : 'Create account'
        }}</gf-button>
      </form>
      <div class="divider"><span>or</span></div>
      <gf-button [disabled]="busy()" (pressed)="google()">Continue with Google</gf-button>
      <p class="account">Already have an account? <a routerLink="/auth/login">Sign in</a></p>
      @if (message()) {
        <p class="message" role="alert">{{ message() }}</p>
      }
    </gf-card>
  </main>`,
  styleUrls: ['./auth-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAccountComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });
  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    await this.run(() =>
      this.auth.createAccount(
        this.form.controls.name.value,
        this.form.controls.email.value,
        this.form.controls.password.value,
      ),
    );
  }
  async google(): Promise<void> {
    if (!this.busy()) await this.run(() => this.auth.signInWithGoogle());
  }
  private async run(operation: () => Promise<SessionUser>): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      const user = await operation();
      await this.router.navigateByUrl(roleDestination(user.roles) ?? '/account/role-required');
    } catch (error) {
      this.message.set(
        error instanceof FirebaseError && error.code === 'auth/email-already-in-use'
          ? 'An account already uses this email. Try signing in instead.'
          : 'We could not create your account. Please try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}

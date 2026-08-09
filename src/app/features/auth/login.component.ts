import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService } from '../../core/auth/auth.service';
import { SessionUser } from '../../core/models/domain.models';
import { GfButton, GfCard } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a class="logo" routerLink="/">Grounded &amp; Fruitful</a>
    <gf-card>
      <p class="eyebrow">Welcome back</p>
      <h1>Sign in</h1>
      <p>For parents, mentors, and administrators.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Email address<input type="email" formControlName="email" autocomplete="email" /></label>
        <label>Password<input type="password" formControlName="password" autocomplete="current-password" /></label>
        <gf-button type="submit" [disabled]="form.invalid || busy()">{{
          busy() ? 'Signing in…' : 'Sign in securely'
        }}</gf-button>
      </form>
      <div class="divider"><span>or</span></div>
      <gf-button [disabled]="busy()" (pressed)="googleSignIn()">Continue with Google</gf-button>
      <p class="account">New here? <a routerLink="/auth/create-account">Create an account</a></p>
      <div class="links">
        <a routerLink="/auth/forgot-password">Forgot password?</a><a routerLink="/auth/child">Child sign in</a>
      </div>
      @if (message()) {
        <p class="message" role="alert">{{ message() }}</p>
      }
    </gf-card>
  </main>`,
  styleUrls: ['./auth-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly message = signal('');
  readonly busy = signal(false);
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    await this.authenticate(() => this.auth.signIn(this.form.controls.email.value, this.form.controls.password.value));
  }

  async googleSignIn(): Promise<void> {
    if (!this.busy()) await this.authenticate(() => this.auth.signInWithGoogle());
  }

  private async authenticate(operation: () => Promise<SessionUser>): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      await this.routeUser(await operation());
    } catch (error) {
      this.message.set(authErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private routeUser(user: SessionUser): Promise<boolean> {
    const role = user.roles[0];
    const destination =
      role === 'child'
        ? '/child/today'
        : role === 'parent'
          ? '/parent/children'
          : role === 'mentor'
            ? '/mentor/teams'
            : role === 'observer'
              ? '/observer/observations'
              : role === 'admin' || role === 'super_admin'
                ? '/admin/users'
                : '/unauthorized';
    return this.router.navigateByUrl(destination);
  }
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) return 'We could not sign you in. Please try again.';
  if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  if (error.code === 'auth/network-request-failed') return 'Check your internet connection and try again.';
  if (error.code === 'auth/too-many-requests') return 'Too many attempts. Please wait and try again.';
  return 'Email or password is incorrect. Please try again.';
}

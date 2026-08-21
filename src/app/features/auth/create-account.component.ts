import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService, RegistrationResult } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { RegistrationIntent } from '../../core/models/domain.models';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { GfButton, GfCard } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a class="logo" routerLink="/">Grounded &amp; Fruitful</a
    ><gf-card>
      <p class="eyebrow">Join the journey</p>
      <h1>Create your account</h1>
      <h2>How will you use Grounded &amp; Fruitful?</h2>
      <fieldset class="account-types">
        <legend class="visually-hidden">Account type</legend>
        <label
          ><input
            type="radio"
            name="intent"
            value="personal"
            [checked]="intent() === 'personal'"
            (change)="intent.set('personal')"
          />
          <span><strong>Personal</strong><small>Manage your family’s growth journey privately.</small></span>
        </label>
        <label
          ><input
            type="radio"
            name="intent"
            value="organization"
            [checked]="intent() === 'organization'"
            (change)="intent.set('organization')"
          />
          <span
            ><strong>Organization</strong><small>Set up a program for families, teams and administrators.</small></span
          >
        </label>
      </fieldset>
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
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly intent = signal<'personal' | 'organization'>('personal');
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
        this.intent(),
      ),
    );
  }
  async google(): Promise<void> {
    if (!this.busy()) await this.run(() => this.auth.signInWithGoogle(this.intent()));
  }
  private async run(operation: () => Promise<RegistrationResult>): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      const result = await operation();
      const destination = this.coordinator.resolvePostAuthenticationRoute(result.session, this.router.url);
      if (destination) await this.router.navigateByUrl(destination);
    } catch (error) {
      this.message.set(registrationErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}

export function registrationDestination(result: RegistrationResult, intent: RegistrationIntent): string {
  const step = result.intentResult.nextStep;
  if (step === 'organization_setup') return '/onboarding/organization';
  if (step === 'personal_workspace_setup') return '/onboarding/personal';
  // Never infer provisioning from the submitted choice; the persisted backend projection must confirm it.
  void intent;
  return '/account/recovery';
}

export function registrationErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use')
    return 'An account already uses this email. Try signing in instead.';
  if (!(error instanceof ApiError)) return 'We could not create your account. Please try again.';
  if (error.status === 401) return 'Your authentication token could not be verified. Please retry or sign in again.';
  if (error.status === 403) return 'This account is disabled or is not eligible to register.';
  if (error.status === 409)
    return 'This account already has a conflicting registration state. Please retry or sign in.';
  if (error.status === 422) return 'Choose a valid personal or organization account type.';
  return error.status === 0
    ? 'The service could not be reached. Check your connection and retry.'
    : 'The registration service could not complete your request. Please retry.';
}

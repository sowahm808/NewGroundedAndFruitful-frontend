import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GfButton, GfCard } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a class="logo" routerLink="/">Grounded &amp; Fruitful</a
    ><gf-card
      ><p class="eyebrow">Welcome back</p>
      <h1>Sign in</h1>
      <p>For parents, mentors, and administrators.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Email address<input type="email" formControlName="email" autocomplete="email" /></label
        ><label>Password<input type="password" formControlName="password" autocomplete="current-password" /></label
        ><gf-button type="submit" [disabled]="form.invalid">Sign in securely</gf-button>
      </form>
      <div class="links">
        <a routerLink="/auth/forgot-password">Forgot password?</a><a routerLink="/auth/child">Child sign in</a>
      </div>
      @if (message()) {
        <p role="status">{{ message() }}</p>
      }
    </gf-card>
  </main>`,
  styles: [
    `
      .auth {
        min-height: 100dvh;
        display: grid;
        place-content: center;
        gap: 1rem;
        padding: 1rem;
        background: linear-gradient(145deg, #edf5e8, #fff8e8);
      }
      gf-card {
        display: block;
        max-width: 430px;
      }
      .logo {
        text-align: center;
        font-weight: 800;
        color: var(--brand);
        text-decoration: none;
      }
      form,
      label {
        display: grid;
        gap: 0.5rem;
      }
      form {
        gap: 1rem;
        margin: 1.5rem 0;
      }
      input {
        min-height: 44px;
        border: 1px solid var(--border);
        border-radius: 0.6rem;
        padding: 0.5rem;
        font: inherit;
      }
      .links {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      .eyebrow {
        color: var(--brand);
        font-weight: 800;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  readonly message = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });
  submit(): void {
    if (this.form.valid) this.message.set('Connect Firebase configuration to complete secure sign in.');
  }
}

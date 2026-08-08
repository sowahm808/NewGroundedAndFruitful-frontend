import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GfButton, GfCard } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfButton, GfCard],
  template: `<main class="auth">
    <a routerLink="/auth/login">← Adult sign in</a
    ><gf-card
      ><p>Child-safe access</p>
      <h1>Ready to grow?</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Family code<input formControlName="familyCode" autocomplete="off" /></label
        ><label>Your handle<input formControlName="handle" autocomplete="username" /></label
        ><label
          >PIN<input type="password" inputmode="numeric" formControlName="pin" autocomplete="current-password" /></label
        ><gf-button type="submit" [disabled]="form.invalid">Let's go</gf-button>
      </form>
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
        background: #f2f7ed;
      }
      gf-card {
        max-width: 420px;
      }
      form,
      label {
        display: grid;
        gap: 0.5rem;
      }
      form {
        gap: 1rem;
      }
      input {
        min-height: 46px;
        border: 2px solid var(--border);
        border-radius: 0.7rem;
        padding: 0.5rem;
        font: inherit;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLoginComponent {
  readonly message = signal('');
  readonly form = new FormGroup({
    familyCode: new FormControl('', { nonNullable: true, validators: Validators.required }),
    handle: new FormControl('', { nonNullable: true, validators: Validators.required }),
    pin: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4,8}$/)] }),
  });
  submit(): void {
    this.message.set('Your secure sign-in details will be exchanged with the backend and are never stored here.');
    this.form.controls.pin.reset();
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, UrlTree } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService, SessionBootstrapError } from '../../core/auth/auth.service';
import { SessionUser } from '../../core/models/domain.models';
import { roleCanAccessPath, roleDestination } from '../../core/auth/role.utilities';
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
        @if (auth.status() === 'error') {
          <gf-button (pressed)="retrySession()">Retry account session</gf-button>
        }
      }
    </gf-card>
  </main>`,
  styleUrls: ['./auth-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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

  async retrySession(): Promise<void> {
    await this.authenticate(async () => {
      const user = await this.auth.retrySession();
      if (!user) throw new SessionBootstrapError('unexpected');
      return user;
    });
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
    if (this.auth.status() === 'pending-approval') return this.router.navigateByUrl('/account/pending');
    if (this.auth.status() === 'disabled') return this.router.navigateByUrl('/account/disabled');
    if (this.auth.status() === 'role-required') return this.router.navigateByUrl('/account/role-required');
    const returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), this.router, user.roles);
    if (returnUrl) return this.router.navigateByUrl(returnUrl);
    return this.router.navigateByUrl(roleDestination(user.roles) ?? '/account/role-required');
  }
}

/** Accept only same-application absolute paths; parsed external or protocol-relative URLs are rejected. */
export function safeReturnUrl(
  candidate: string | null,
  router: Router,
  roles: SessionUser['roles'] = [],
): UrlTree | null {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    // eslint-disable-next-line no-control-regex -- control bytes are invalid in a return URL.
    /[\\\u0000-\u001f\u007f]/.test(candidate)
  )
    return null;
  try {
    // Reject bad percent escapes and encoded protocol-relative paths before Angular normalizes them.
    if (decodeURIComponent(candidate).startsWith('//')) return null;
    const tree = router.parseUrl(candidate);
    const path = '/' + (tree.root.children['primary']?.segments.map((segment) => segment.path).join('/') ?? '');
    if (
      path === '/unauthorized' ||
      path.startsWith('/unauthorized/') ||
      path === '/auth' ||
      path.startsWith('/auth/') ||
      path.startsWith('/account/') ||
      !roleCanAccessPath(roles, path)
    )
      return null;
    return tree.root.children['primary'] ? tree : null;
  } catch {
    return null;
  }
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof SessionBootstrapError) {
    if (error.kind === 'network')
      return 'Your account was verified, but the session service is unreachable. Check your connection and retry.';
    const reference = error.requestId ? ` Support reference: ${error.requestId}.` : '';
    if (error.kind === 'authentication')
      return `Your sign-in token was not accepted. Sign out, sign in again, and retry.${reference}`;
    if (error.kind === 'forbidden') return `Your account is disabled or not approved for this program.${reference}`;
    if (error.kind === 'not-found') return `The account session endpoint is unavailable. Contact support.${reference}`;
    if (error.kind === 'rate-limit') return `Too many session requests were made. Wait a moment and retry.${reference}`;
    if (error.kind === 'server') return `The session service could not complete the request. Retry shortly.${reference}`;
    return `Your account was verified, but its session could not be restored.${reference}`;
  }
  if (!(error instanceof FirebaseError)) return 'We could not complete sign-in. Please try again.';
  if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  if (error.code === 'auth/network-request-failed') return 'Check your internet connection and try again.';
  if (error.code === 'auth/too-many-requests') return 'Too many attempts. Please wait and try again.';
  return 'Email or password is incorrect. Please try again.';
}

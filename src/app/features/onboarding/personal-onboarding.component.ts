import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { ApiError } from '../../core/http/api-error';
import { SessionUser } from '../../core/models/domain.models';
import { GfAlert, GfButton, GfPageHeader } from '../../shared/components/design-system';
import { PersonalOnboardingApiService } from './personal-onboarding-api.service';

export type PersonalSetupState =
  | 'initializing'
  | 'confirming_timezone'
  | 'creating_workspace'
  | 'refreshing_token'
  | 'refreshing_session'
  | 'completed'
  | 'recoverable_error'
  | 'conflict'
  | 'forbidden'
  | 'session_error';

const IDEMPOTENCY_KEY_PREFIX = 'gf:personal-workspace-setup:';

@Component({
  standalone: true,
  imports: [GfAlert, GfButton, GfPageHeader],
  template: `<main>
    <gf-page-header title="Preparing your personal workspace" eyebrow="Account setup">
      <p>We’re setting up a private space for your family’s growth journey.</p>
    </gf-page-header>

    @if (state() === 'confirming_timezone') {
      <section class="timezone" aria-labelledby="timezone-heading">
        <h2 id="timezone-heading">Choose your timezone</h2>
        <p>We could not detect your browser timezone. Select an IANA timezone to continue.</p>
        <label for="personal-timezone">Timezone</label>
        <input id="personal-timezone" #timezoneInput autocomplete="off" placeholder="America/New_York" />
        @if (timezoneError()) {
          <p class="field-error" role="alert">{{ timezoneError() }}</p>
        }
        <gf-button (pressed)="confirmTimezone(timezoneInput.value)">Continue</gf-button>
      </section>
    }

    @if (isWorking()) {
      <p class="status" role="status">{{ statusMessage() }}</p>
    }

    @if (error(); as message) {
      <gf-alert [title]="errorTitle()"
        ><p>{{ message }}</p></gf-alert
      >
      <div class="actions">
        @if (state() === 'recoverable_error' || state() === 'conflict' || state() === 'session_error') {
          <gf-button [disabled]="isWorking()" (pressed)="retry()">Try setup again</gf-button>
        }
        <gf-button [disabled]="isWorking()" (pressed)="signOut()">Sign out</gf-button>
      </div>
    }
  </main>`,
  styles: [
    `
      main {
        max-width: 40rem;
        margin: 3rem auto;
        padding: 1.5rem;
      }
      .timezone {
        display: grid;
        gap: 0.65rem;
      }
      input {
        min-height: 44px;
        padding: 0.65rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      label {
        font-weight: 700;
      }
      .field-error {
        color: #8b1e1e;
        font-weight: 700;
      }
      .status {
        color: var(--muted);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalOnboardingComponent implements OnInit {
  private readonly api = inject(PersonalOnboardingApiService);
  private readonly auth = inject(AuthService);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  private readonly router = inject(Router);
  readonly state = signal<PersonalSetupState>('initializing');
  readonly error = signal('');
  readonly timezoneError = signal('');
  private inFlight?: Promise<void>;
  private timezone = '';
  private tokenRefreshAttempted = false;

  ngOnInit(): void {
    const session = this.auth.user();
    if (!session) {
      this.fail('session_error', 'Your authenticated session could not be loaded.');
      return;
    }
    if (session.registrationIntent !== 'personal') {
      void this.navigateFromSession(session);
      return;
    }
    if (session.onboardingStatus === 'complete') {
      void this.navigateFromSession(session);
      return;
    }
    if (session.onboardingStatus !== 'personal_workspace_required') {
      this.fail('session_error', 'Your account is not ready for personal workspace setup.');
      return;
    }
    this.timezone = browserTimezone();
    if (!this.timezone) {
      this.state.set('confirming_timezone');
      return;
    }
    void this.start();
  }

  readonly isWorking = () =>
    ['initializing', 'creating_workspace', 'refreshing_token', 'refreshing_session'].includes(this.state());

  statusMessage(): string {
    if (this.state() === 'refreshing_token') return 'Securing your new workspace…';
    if (this.state() === 'refreshing_session') return 'Confirming your workspace…';
    return 'Creating your private workspace…';
  }

  errorTitle(): string {
    if (this.state() === 'forbidden') return 'Workspace setup is not permitted';
    if (this.state() === 'conflict') return 'Workspace setup needs another check';
    if (this.state() === 'session_error') return 'Your session could not be confirmed';
    return 'Personal workspace could not be created';
  }

  confirmTimezone(value: string): void {
    const timezone = value.trim();
    if (!isIanaTimezone(timezone)) {
      this.timezoneError.set('Enter a valid IANA timezone, such as America/New_York.');
      return;
    }
    this.timezone = timezone;
    this.timezoneError.set('');
    void this.start();
  }

  retry(): Promise<void> {
    return this.start();
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
  }

  private start(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.bootstrap().finally(() => (this.inFlight = undefined));
    return this.inFlight;
  }

  private async bootstrap(): Promise<void> {
    const session = this.auth.user();
    if (!session || session.registrationIntent !== 'personal') {
      this.fail('session_error', 'Only a personal registration can create a personal workspace.');
      return;
    }
    if (!isIanaTimezone(this.timezone)) {
      this.state.set('confirming_timezone');
      return;
    }
    this.error.set('');
    this.state.set('creating_workspace');
    const key = logicalIdempotencyKey(session.uid);
    try {
      const result = await firstValueFrom(this.api.bootstrap({ timezone: this.timezone }, key));
      try {
        await this.refreshAndComplete(result.tokenRefreshRequired);
      } catch {
        this.fail(
          'session_error',
          'Your workspace was created, but the updated session could not be confirmed. Try again.',
        );
      }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.code === 'business_conflict')) {
        // An idempotent replay may report that setup already exists. The session is authoritative.
        try {
          await this.refreshAndComplete(false);
        } catch {
          this.fail('conflict', 'Setup may already be complete, but we could not confirm your workspace. Try again.');
        }
      } else if (error instanceof ApiError && error.status === 403) {
        this.fail('forbidden', 'The server did not permit personal workspace setup for this account.');
      } else {
        this.fail('recoverable_error', 'We could not create your personal workspace. Try setup again.');
      }
    }
  }

  private async refreshAndComplete(tokenRefreshRequired: boolean): Promise<void> {
    const forceToken = tokenRefreshRequired && !this.tokenRefreshAttempted;
    if (forceToken) {
      this.tokenRefreshAttempted = true;
      this.state.set('refreshing_token');
    }
    this.state.set(forceToken ? 'refreshing_token' : 'refreshing_session');
    const session = await this.auth.refreshSession(forceToken);
    this.state.set('refreshing_session');
    if (!session || !personalSetupConfirmed(session))
      throw new Error('The authoritative session did not confirm personal workspace setup.');
    const destination = this.coordinator.decision(session);
    if (destination.reason !== 'dashboard' || !destination.path.startsWith('/parent/'))
      throw new Error('The authoritative session did not grant access to the personal dashboard.');
    clearLogicalIdempotencyKey(session.uid);
    this.state.set('completed');
    await this.router.navigateByUrl(destination.path, { replaceUrl: true });
  }

  private async navigateFromSession(session: SessionUser): Promise<void> {
    const target = this.coordinator.resolvePostAuthenticationRoute(session, this.router.url);
    if (target) await this.router.navigateByUrl(target, { replaceUrl: true });
  }

  private fail(state: PersonalSetupState, message: string): void {
    this.state.set(state);
    this.error.set(message);
  }
}

export function personalSetupConfirmed(session: SessionUser): boolean {
  const personalWorkspace = session.workspaces?.find((workspace) => workspace.type === 'personal');
  return Boolean(
    session.onboardingStatus === 'complete' &&
    personalWorkspace &&
    session.memberships.some((membership) => membership.status === 'active') &&
    session.activeWorkspaceId === personalWorkspace.id,
  );
}

export function browserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isIanaTimezone(timezone) ? timezone : '';
  } catch {
    return '';
  }
}

export function isIanaTimezone(timezone: string): boolean {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function logicalIdempotencyKey(uid: string): string {
  const storageKey = `${IDEMPOTENCY_KEY_PREFIX}${uid}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = globalThis.crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return globalThis.crypto.randomUUID();
  }
}

function clearLogicalIdempotencyKey(uid: string): void {
  try {
    sessionStorage.removeItem(`${IDEMPOTENCY_KEY_PREFIX}${uid}`);
  } catch {
    // Storage can be unavailable in privacy-restricted browsers; backend idempotency remains the final safeguard.
  }
}

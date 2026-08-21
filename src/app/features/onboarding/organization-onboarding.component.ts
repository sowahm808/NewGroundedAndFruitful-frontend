import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { SessionUser } from '../../core/models/domain.models';
import { GfAlert, GfPageHeader } from '../../shared/components/design-system';
import {
  BootstrapContractError,
  BootstrapOrganizationResponse,
  OrganizationOnboardingApiService,
} from './organization-onboarding-api.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfPageHeader],
  template: `
    <main>
      <gf-page-header title="Set up your organization" eyebrow="Account setup">
        <p>Create the organization that will own your program, participants, teams, quarters and content.</p>
      </gf-page-header>
      @if (inconsistent()) {
        <gf-alert title="We need to finish setting up your account">
          <p>
            Your account setup has not yet produced an active organization membership. You can reload your account or
            continue setup.
          </p>
          <button type="button" (click)="reload()">Reload account</button>
        </gf-alert>
      }
      @if (error(); as failure) {
        <gf-alert title="Organization could not be created">
          <p>{{ errorMessage(failure) }}</p>
          @if (failure.requestId) {
            <p>Support reference: {{ failure.requestId }}</p>
          }
          @if (bootstrapCommitted()) {
            <button type="button" [disabled]="saving()" (click)="continueSetup()">Continue setup</button>
            <button type="button" [disabled]="saving()" (click)="signOut()">Sign out</button>
          }
        </gf-alert>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (form.invalid && form.touched) {
          <p class="summary" role="alert">Review the highlighted fields.</p>
        }
        <label for="organization-name">Organization name</label>
        <input
          id="organization-name"
          formControlName="name"
          maxlength="120"
          autocomplete="organization"
          (input)="suggestSlug()"
        />
        @if (invalid('name')) {
          <p class="field-error">Enter a name between 2 and 120 characters.</p>
        }
        @if (backendError('name'); as message) {
          <p class="field-error">{{ message }}</p>
        }

        <label for="organization-slug">Organization slug</label>
        <input
          id="organization-slug"
          formControlName="slug"
          maxlength="63"
          autocomplete="off"
          (input)="slugEdited.set(true)"
        />
        <p class="hint">Lowercase letters, numbers and single hyphens.</p>
        @if (invalid('slug')) {
          <p class="field-error">Enter a valid slug between 2 and 63 characters.</p>
        }
        @if (backendError('slug'); as message) {
          <p class="field-error">{{ message }}</p>
        }

        <label for="organization-timezone">Timezone</label>
        <input id="organization-timezone" formControlName="timezone" list="common-timezones" autocomplete="off" />
        <datalist id="common-timezones">
          @for (timezone of timezones; track timezone) {
            <option [value]="timezone"></option>
          }
        </datalist>
        @if (invalid('timezone')) {
          <p class="field-error">Enter a supported IANA timezone, such as America/New_York.</p>
        }
        @if (backendError('timezone'); as message) {
          <p class="field-error">{{ message }}</p>
        }
        <label class="confirm"
          ><input type="checkbox" formControlName="timezoneConfirmed" /> I confirm this timezone is correct.</label
        >
        @if (invalid('timezoneConfirmed')) {
          <p class="field-error">Confirm the timezone before continuing.</p>
        }

        <button class="primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Creating organization…' : 'Create organization' }}
        </button>
        <span class="sr-only" aria-live="polite">{{ saving() ? 'Creating organization' : '' }}</span>
      </form>
    </main>
  `,
  styles: [
    `
      main {
        max-width: 40rem;
        margin: 3rem auto;
        padding: 1.5rem;
      }
      form {
        display: grid;
        gap: 0.45rem;
        padding: 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
      }
      label {
        font-weight: 700;
        margin-top: 0.6rem;
      }
      input,
      button {
        min-height: 44px;
        padding: 0.65rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      .confirm {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        font-weight: 600;
      }
      .confirm input {
        width: 1.25rem;
        min-height: auto;
      }
      .primary {
        margin-top: 1rem;
        color: white;
        background: var(--brand);
        font-weight: 800;
        cursor: pointer;
      }
      .field-error,
      .summary {
        color: #8b1e1e;
        font-weight: 700;
      }
      .hint {
        margin: 0;
        color: var(--muted);
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOnboardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(OrganizationOnboardingApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  readonly saving = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly slugEdited = signal(false);
  readonly timezones = [
    'Africa/Accra',
    'America/Chicago',
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'UTC',
  ];
  readonly inconsistent = signal(this.auth.user()?.onboardingStatus === 'complete');
  readonly bootstrapCommitted = signal(false);
  private retrySubmission?: { readonly fingerprint: string; readonly key: string; tokenRefreshAttempted: boolean };
  private committedBootstrap?: BootstrapOrganizationResponse;
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(63), Validators.pattern(SLUG)]],
    timezone: [browserTimezone(), [Validators.required, ianaTimezone]],
    timezoneConfirmed: [false, Validators.requiredTrue],
  });

  suggestSlug(): void {
    if (!this.slugEdited()) this.form.controls.slug.setValue(toSlug(this.form.controls.name.value));
  }
  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.form.touched);
  }
  async reload(): Promise<void> {
    await this.auth.refreshSession();
  }
  async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  async continueSetup(): Promise<void> {
    if (!this.committedBootstrap || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.completeCommittedBootstrap(this.committedBootstrap, true);
    } catch (error) {
      this.setFailure(error, 'session_refresh_failed');
    } finally {
      this.saving.set(false);
    }
  }
  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    const command = { name: value.name.trim(), slug: value.slug.trim(), timezone: value.timezone.trim() };
    const fingerprint = JSON.stringify(command);
    const submission =
      this.retrySubmission?.fingerprint === fingerprint
        ? this.retrySubmission
        : { fingerprint, key: createIdempotencyKey(), tokenRefreshAttempted: false };
    this.retrySubmission = submission;
    try {
      if (this.committedBootstrap) {
        await this.completeCommittedBootstrap(this.committedBootstrap, true);
        return;
      }
      const result = await firstValueFrom(this.api.bootstrap(command, submission.key));
      this.committedBootstrap = result;
      this.bootstrapCommitted.set(true);
      await this.completeCommittedBootstrap(result, false, submission);
    } catch (error) {
      this.setFailure(error, this.bootstrapCommitted() ? 'session_refresh_failed' : 'bootstrap_request_failed');
    } finally {
      this.saving.set(false);
    }
  }

  private async completeCommittedBootstrap(
    result: BootstrapOrganizationResponse,
    recovery: boolean,
    submission = this.retrySubmission,
  ): Promise<void> {
    const forceTokenRefresh = (result.tokenRefreshRequired || recovery) && !submission?.tokenRefreshAttempted;
    // A replay of this logical submission can return the cached bootstrap response.
    // Remember that its refresh instruction was already honored so an exact retry
    // reloads the backend session without repeatedly force-refreshing Firebase.
    if (forceTokenRefresh && submission) submission.tokenRefreshAttempted = true;
    const session = await this.auth.refreshSession(forceTokenRefresh);
    console.info('Organization onboarding session refreshed', {
      sessionPresent: Boolean(session),
      onboardingStatus: session?.onboardingStatus,
      workspaceCount: session?.workspaces?.length ?? 0,
      activeMembershipCount: session?.memberships.filter((membership) => membership.status === 'active').length ?? 0,
      activeWorkspaceIdPresent: Boolean(session?.activeWorkspaceId),
    });
    const membership = session?.memberships.find(
      (m) => m.status === 'active' && m.organizationId === result.workspace.id,
    );
    const workspaces = session?.workspaces ?? [];
    const hasWorkspace = workspaces.some(
      (workspace) => workspace.type === 'organization' && workspace.id === result.workspace.id,
    );
    if (
      session?.onboardingStatus !== 'complete' ||
      !membership ||
      !hasWorkspace ||
      session.activeWorkspaceId !== result.workspace.id
    )
      throw new Error(sessionPostconditionFailure(session, result.workspace.id));
    const destination = this.coordinator.decision(session);
    if (destination.reason !== 'dashboard') throw new Error('The refreshed session did not resolve to a dashboard.');
    this.retrySubmission = undefined;
    this.committedBootstrap = undefined;
    this.bootstrapCommitted.set(false);
    await this.router.navigateByUrl(destination.path, { replaceUrl: true });
  }

  private setFailure(error: unknown, stage: string): void {
    if (error instanceof BootstrapContractError) {
      console.error('Organization bootstrap contract invalid', { stage, ...error.diagnostics });
    }
    const message =
      this.bootstrapCommitted() &&
      !(error instanceof BootstrapContractError) &&
      !(error instanceof Error && error.message.startsWith('Session returned incomplete committed state:'))
        ? 'Your organization was created, but we could not finish signing you in.'
        : error instanceof Error
          ? error.message
          : 'Organization setup failed.';
    this.error.set(error instanceof ApiError ? error : new ApiError(-1, 'unexpected_error', message));
  }
  errorMessage(error: ApiError): string {
    if (error.code === 'business_conflict')
      return 'That organization name or slug is already in use, or setup was already completed.';
    if (error.code === 'validation_error')
      return 'The organization details are invalid. Check the timezone and highlighted fields.';
    if (error.code === 'approval_pending') return 'Your account is still awaiting approval to create an organization.';
    if (error.code === 'account_disabled') return 'This account is disabled and cannot create an organization.';
    if (error.code === 'role_required') return 'This account is not eligible to create an organization.';
    return error.message;
  }

  backendError(name: 'name' | 'slug' | 'timezone'): string | null {
    return this.error()?.fieldErrors?.[name]?.[0] ?? null;
  }
}

function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
    .replace(/-$/g, '');
}
function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
}
function ianaTimezone(control: { value: string }): { timezone: true } | null {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: control.value.trim() }).format();
    return null;
  } catch {
    return { timezone: true };
  }
}

function sessionPostconditionFailure(session: SessionUser | null, workspaceId: string): string {
  if (!session) return 'Session refresh failed: no session was returned.';
  if (session.onboardingStatus !== 'complete') return 'Session returned incomplete committed state: onboardingStatus.';
  if (!session.workspaces?.some((workspace) => workspace.id === workspaceId && workspace.type === 'organization'))
    return 'Session returned incomplete committed state: workspace missing.';
  if (
    !session.memberships.some(
      (membership) => membership.status === 'active' && membership.organizationId === workspaceId,
    )
  )
    return 'Session returned incomplete committed state: membership missing.';
  return 'Session returned incomplete committed state: activeWorkspaceId missing or mismatched.';
}

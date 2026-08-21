import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { RegistrationIntent } from '../../core/models/domain.models';
import { GfAlert, GfButton, GfCard } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfAlert, GfButton, GfCard],
  template: `<main class="setup">
    <gf-card
      ><p class="eyebrow">Account setup</p>
      <h1>Choose your account type</h1>
      <p>Choose Personal for your family, or Organization to run a program for participants and teams.</p>
      @if (error()) {
        <gf-alert title="Account type could not be saved"
          ><p>{{ error() }}</p></gf-alert
        >
      }
      <div class="actions">
        <gf-button [disabled]="busy()" (pressed)="choose('personal')">Personal</gf-button>
        <gf-button [disabled]="busy()" (pressed)="choose('organization')">Organization</gf-button>
      </div>
      <span aria-live="polite">{{ busy() ? 'Saving account type…' : '' }}</span>
    </gf-card>
  </main>`,
  styles: [
    `
      .setup {
        max-width: 40rem;
        margin: 3rem auto;
        padding: 1.5rem;
      }
      .actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeComponent {
  private readonly auth = inject(AuthService);
  private readonly coordinator = inject(PostAuthRouteCoordinator);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');

  async choose(intent: RegistrationIntent): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.completeRegistrationIntent(intent);
      const target = this.coordinator.resolvePostAuthenticationRoute(result.session, this.router.url);
      if (target) await this.router.navigateByUrl(target);
    } catch {
      this.error.set('Your account type was not saved. Please retry.');
    } finally {
      this.busy.set(false);
    }
  }
}

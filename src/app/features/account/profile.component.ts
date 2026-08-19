import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/domain.models';
import { GfAlert, GfCard, GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [GfAlert, GfCard, GfPageHeader],
  template: `
    <gf-page-header title="Profile" eyebrow="Account">
      <p>Your read-only account information comes from your authenticated application session.</p>
    </gf-page-header>
    @if (auth.user(); as user) {
      <gf-card>
        <dl>
          <div><dt>Display name</dt><dd>{{ user.displayName }}</dd></div>
          @if (user.email) { <div><dt>Email</dt><dd>{{ user.email }}</dd></div> }
          <div><dt>Roles</dt><dd>{{ roleLabels() }}</dd></div>
          <div><dt>Account status</dt><dd>{{ user.disabled ? 'Disabled' : 'Active' }}</dd></div>
        </dl>
      </gf-card>
      <gf-alert title="Read-only profile">
        Profile editing is not available because no authorized profile-update contract has been published.
      </gf-alert>
    }
  `,
  styles: [`
    :host { display: block; max-width: 56rem; }
    dl { margin: 0; }
    dl div { display: grid; grid-template-columns: minmax(8rem, 1fr) 2fr; gap: 1rem; padding: .85rem 0; border-bottom: 1px solid var(--border); }
    dl div:last-child { border-bottom: 0; }
    dt { color: var(--muted); font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
    gf-alert { display: block; margin-top: 1rem; }
    @media (max-width: 480px) { dl div { grid-template-columns: 1fr; gap: .25rem; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  roleLabels(): string {
    return this.auth.roles().map(roleLabel).join(', ');
  }
}

function roleLabel(role: UserRole): string {
  return role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

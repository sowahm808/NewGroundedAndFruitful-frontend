import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../models/domain.models';

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly exact?: boolean;
  readonly requiredRoles: readonly UserRole[];
}

const NAVIGATION: readonly NavigationItem[] = [
  { label: 'Today', path: '/child/today', requiredRoles: ['child'] },
  { label: 'Character', path: '/child/character', requiredRoles: ['child'] },
  { label: 'Bible', path: '/child/bible', requiredRoles: ['child'] },
  { label: 'Reading', path: '/child/reading', requiredRoles: ['child'] },
  { label: 'Project', path: '/child/project', requiredRoles: ['child'] },
  { label: 'Team', path: '/child/team', requiredRoles: ['child'] },
  { label: 'Children', path: '/parent/children', requiredRoles: ['parent'] },
  { label: 'Participation', path: '/parent/participation', requiredRoles: ['parent'] },
  { label: 'Character', path: '/parent/character', requiredRoles: ['parent'] },
  { label: 'Observations', path: '/parent/observations', requiredRoles: ['parent'] },
  { label: 'Family', path: '/parent/family', requiredRoles: ['parent'] },
  { label: 'Support', path: '/parent/academic-support', requiredRoles: ['parent'] },
  { label: 'Reports', path: '/parent/reports', requiredRoles: ['parent'] },
  { label: 'Notifications', path: '/parent/notifications', requiredRoles: ['parent'] },
  { label: 'Teams', path: '/mentor/teams', requiredRoles: ['mentor'] },
  { label: 'Projects', path: '/mentor/projects', requiredRoles: ['mentor'] },
  { label: 'Reading', path: '/mentor/reading', requiredRoles: ['mentor'] },
  { label: 'Encouragement', path: '/mentor/encouragement', requiredRoles: ['mentor'] },
  { label: 'Observations', path: '/observer/observations', requiredRoles: ['observer'] },
  { label: 'Users', path: '/admin/users', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Organizations', path: '/admin/organizations', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Memberships', path: '/admin/memberships', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Roles', path: '/admin/roles', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Participants', path: '/admin/participants', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Teams', path: '/admin/teams', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Assignments', path: '/admin/assignments', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Quarters', path: '/admin/quarters', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Character', path: '/admin/character', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Bible', path: '/admin/bible', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Family activities', path: '/admin/family', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Books', path: '/admin/books', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Projects', path: '/admin/projects', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Surveys', path: '/admin/surveys', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Point rules', path: '/admin/points', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Reports', path: '/admin/reports', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Awards', path: '/admin/awards', requiredRoles: ['admin', 'super_admin'] },
  { label: 'Audit', path: '/admin/audit', requiredRoles: ['admin', 'super_admin'] },
];

@Component({
  selector: 'gf-app-shell',
  standalone: true,
  imports: [A11yModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <header class="toolbar">
        @if (mobile()) {
          <button
            #menuButton
            class="icon-button hamburger"
            type="button"
            [attr.aria-label]="drawerOpen() ? 'Close navigation' : 'Open navigation'"
            [attr.aria-expanded]="drawerOpen()"
            aria-controls="primary-navigation"
            (click)="toggleDrawer()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        }
        <a class="brand" [routerLink]="homePath()" aria-label="Grounded and Fruitful home">
          <svg class="brand-mark" aria-hidden="true" viewBox="0 0 32 32" focusable="false">
            <path d="M16 27V13m0 5c-5 0-9-3-9-8 5 0 9 3 9 8Zm0-4c0-5 4-9 9-9 0 5-4 9-9 9Z" />
          </svg>
          <span class="brand-name">Grounded <b>&amp; Fruitful</b></span>
        </a>
        <span class="toolbar-spacer"></span>
        <div class="utility">
          <button
            #profileButton
            class="profile-trigger"
            type="button"
            aria-haspopup="menu"
            [attr.aria-expanded]="utilityOpen()"
            aria-controls="profile-menu"
            (click)="toggleUtility()"
            (keydown.arrowdown)="openUtilityAndFocusFirst($event)"
          >
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="identity">
              <span class="display-name">{{ auth.user()?.displayName || 'My account' }}</span>
              <span class="role-label">{{ roleLabel() }}</span>
            </span>
            <svg class="chevron" aria-hidden="true" viewBox="0 0 20 20"><path d="m6 8 4 4 4-4" /></svg>
            <span class="sr-only">Account menu</span>
          </button>
          @if (utilityOpen()) {
            <div id="profile-menu" class="profile-menu" role="menu" tabindex="-1" (keydown)="onMenuKeydown($event)">
              @if (auth.user(); as user) {
                <div class="account-context">
                  <strong>{{ user.displayName }}</strong>
                  @if (user.email) {
                    <span>{{ user.email }}</span>
                  }
                  <span>{{ roleLabel() }}</span>
                </div>
              }
              <a #menuItem role="menuitem" routerLink="/account/profile" (click)="closeUtility(false)">Profile</a>
              <button #menuItem role="menuitem" type="button" [disabled]="loggingOut()" (click)="logout()">
                {{ loggingOut() ? 'Logging out…' : 'Logout' }}
              </button>
            </div>
          }
        </div>
      </header>

      @if (mobile() && drawerOpen()) {
        <button class="backdrop" type="button" aria-label="Close navigation" (click)="closeDrawer()"></button>
      }
      <aside
        id="primary-navigation"
        class="drawer"
        [class.mobile-drawer]="mobile()"
        [class.open]="drawerOpen()"
        [attr.aria-hidden]="mobile() && !drawerOpen() ? 'true' : null"
        [cdkTrapFocus]="mobile() && drawerOpen()"
        [cdkTrapFocusAutoCapture]="mobile() && drawerOpen()"
      >
        <div class="drawer-heading">
          <span>Navigation</span>
          @if (mobile()) {
            <button class="drawer-close" type="button" aria-label="Close navigation" (click)="closeDrawer()">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          }
        </div>
        <nav aria-label="Main navigation">
          @for (item of links(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              #active="routerLinkActive"
              [attr.aria-current]="active.isActive ? 'page' : null"
              (click)="closeDrawer(false)"
              >{{ item.label }}</a
            >
          }
        </nav>
        <small>Grow with purpose.</small>
      </aside>

      <main
        [attr.inert]="mobile() && drawerOpen() ? '' : null"
        [attr.aria-hidden]="mobile() && drawerOpen() ? 'true' : null"
      >
        <router-outlet />
      </main>
      @if (logoutError()) {
        <div class="logout-error" role="alert">{{ logoutError() }}</div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .shell {
        min-height: 100dvh;
        overflow-x: clip;
      }
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 30;
        height: 64px;
        padding: 0 max(1rem, env(safe-area-inset-right)) 0 max(1rem, env(safe-area-inset-left));
        background: var(--brand-dark);
        color: #fff;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 2px 12px #0002;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 44px;
        color: #fff;
        text-decoration: none;
        font-size: clamp(1rem, 3vw, 1.3rem);
        font-weight: 800;
        white-space: nowrap;
      }
      .brand-mark {
        width: 32px;
        height: 32px;
        padding: 3px;
        border-radius: 50%;
        color: #ffd77a;
        background: #ffffff14;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .brand-name b {
        color: #ffd77a;
      }
      .toolbar-spacer {
        flex: 1;
        min-width: 0;
      }
      button {
        font: inherit;
      }
      .icon-button,
      .profile-trigger {
        min-width: 44px;
        min-height: 44px;
        border: 0;
        border-radius: 0.65rem;
        color: #fff;
        background: transparent;
        cursor: pointer;
      }
      .icon-button:hover,
      .profile-trigger:hover {
        background: #ffffff1f;
      }
      .hamburger {
        display: grid;
        place-items: center;
        padding: 0.6rem;
      }
      .hamburger svg {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
      }
      .utility {
        position: relative;
        min-width: 0;
      }
      .profile-trigger {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        max-width: min(20rem, 42vw);
        padding: 0.25rem 0.55rem;
      }
      .avatar {
        display: grid;
        place-items: center;
        flex: 0 0 34px;
        height: 34px;
        border-radius: 50%;
        color: var(--brand-dark);
        background: #ffd77a;
        font-weight: 800;
      }
      .identity {
        display: grid;
        min-width: 0;
        text-align: left;
      }
      .display-name,
      .role-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .display-name {
        font-weight: 700;
      }
      .role-label {
        color: #dcebd5;
        font-size: 0.72rem;
        line-height: 1.15;
      }
      .chevron {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .profile-menu {
        position: absolute;
        z-index: 50;
        top: calc(100% + 0.5rem);
        right: 0;
        width: min(19rem, calc(100vw - 2rem));
        padding: 0.45rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        color: var(--ink);
        background: #fff;
        box-shadow: 0 12px 36px #0003;
      }
      .account-context {
        display: grid;
        gap: 0.25rem;
        padding: 0.65rem 0.75rem 0.8rem;
        border-bottom: 1px solid var(--border);
        overflow-wrap: anywhere;
      }
      .account-context span {
        color: var(--muted);
        font-size: 0.85rem;
      }
      .profile-menu a,
      .profile-menu button {
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 44px;
        padding: 0.65rem 0.75rem;
        border: 0;
        border-radius: 0.45rem;
        color: inherit;
        background: transparent;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
      }
      .profile-menu a:hover,
      .profile-menu button:hover {
        background: var(--leaf-soft);
      }
      .drawer {
        position: fixed;
        z-index: 20;
        inset: 64px auto 0 0;
        width: 240px;
        padding: 1.25rem;
        background: var(--brand);
        color: #fff;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }
      .drawer nav {
        display: grid;
        gap: 0.25rem;
      }
      .drawer-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 44px;
        margin-bottom: 0.75rem;
        padding-left: 0.8rem;
        color: #dcebd5;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .drawer-close {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        padding: 0.6rem;
        border: 0;
        border-radius: 0.65rem;
        color: #fff;
        background: transparent;
        cursor: pointer;
      }
      .drawer-close:hover {
        background: #ffffff1f;
      }
      .drawer-close svg {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
      }
      .drawer a {
        min-height: 44px;
        padding: 0.7rem 0.8rem;
        border-radius: 0.55rem;
        color: inherit;
        text-decoration: none;
      }
      .drawer a:hover,
      .drawer a.active {
        background: #ffffff24;
      }
      .drawer small {
        margin-top: auto;
        padding-top: 1rem;
      }
      main {
        min-width: 0;
        margin-left: 240px;
        padding: clamp(1rem, 3vw, 3rem);
        scroll-margin-top: 72px;
      }
      .mobile-drawer {
        z-index: 40;
        width: min(19rem, 86vw);
        transform: translateX(-105%);
        visibility: hidden;
        transition:
          transform 0.2s ease,
          visibility 0.2s;
        box-shadow: 8px 0 24px #0003;
      }
      .mobile-drawer.open {
        transform: none;
        visibility: visible;
      }
      .backdrop {
        position: fixed;
        z-index: 35;
        inset: 64px 0 0;
        width: 100%;
        border: 0;
        background: #17231db8;
        cursor: pointer;
      }
      .logout-error {
        position: fixed;
        z-index: 60;
        right: 1rem;
        bottom: 1rem;
        max-width: min(28rem, calc(100vw - 2rem));
        padding: 1rem;
        border-radius: var(--radius-md);
        background: #fff4d8;
        border-left: 4px solid #a13b2b;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      @media (max-width: 959px) {
        main {
          margin-left: 0;
        }
        .identity,
        .chevron {
          display: none;
        }
      }
      @media (max-width: 420px) {
        .brand-name {
          font-size: 0.95rem;
        }
        .toolbar {
          gap: 0.35rem;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .mobile-drawer {
          transition: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  readonly mobile = signal(false);
  readonly drawerOpen = signal(false);
  readonly utilityOpen = signal(false);
  readonly loggingOut = signal(false);
  readonly logoutError = signal<string | null>(null);
  readonly links = computed(() =>
    NAVIGATION.filter((item) => item.requiredRoles.some((role) => this.auth.roles().includes(role))),
  );
  readonly initials = computed(() => initialsFor(this.auth.user()?.displayName ?? ''));
  readonly roleLabel = computed(() => this.auth.roles().map(formatRole).join(', '));
  readonly homePath = computed(() => this.links()[0]?.path ?? '/account/profile');

  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('profileButton') private profileButton?: ElementRef<HTMLButtonElement>;

  constructor() {
    this.destroyRef.onDestroy(() => this.setPageScrollLocked(false));
    this.breakpoint
      .observe('(max-width: 959px)')
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        this.mobile.set(matches);
        if (!matches) this.closeDrawer(false);
      });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.closeDrawer(false);
        this.closeUtility(false);
      });
  }

  toggleDrawer(): void {
    if (this.drawerOpen()) this.closeDrawer();
    else this.openDrawer();
  }
  openDrawer(): void {
    if (this.mobile()) {
      this.drawerOpen.set(true);
      this.setPageScrollLocked(true);
    }
  }
  closeDrawer(restoreFocus = true): void {
    const wasOpen = this.drawerOpen();
    this.drawerOpen.set(false);
    this.setPageScrollLocked(false);
    if (restoreFocus && wasOpen) queueMicrotask(() => this.menuButton?.nativeElement.focus());
  }
  toggleUtility(): void {
    if (this.utilityOpen()) this.closeUtility();
    else {
      this.utilityOpen.set(true);
      queueMicrotask(() => this.firstMenuItem()?.focus());
    }
  }
  openUtilityAndFocusFirst(event: Event): void {
    event.preventDefault();
    this.utilityOpen.set(true);
    queueMicrotask(() => this.firstMenuItem()?.focus());
  }
  closeUtility(restoreFocus = true): void {
    const wasOpen = this.utilityOpen();
    this.utilityOpen.set(false);
    if (restoreFocus && wasOpen) queueMicrotask(() => this.profileButton?.nativeElement.focus());
  }
  onMenuKeydown(event: KeyboardEvent): void {
    const items = this.menuItems();
    const activeElement = this.document.activeElement;
    const current = activeElement instanceof HTMLElement ? items.indexOf(activeElement) : -1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      items[(current + offset + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  }
  @HostListener('document:keydown.escape') onEscape(): void {
    if (this.utilityOpen()) this.closeUtility();
    else if (this.drawerOpen()) this.closeDrawer();
  }
  @HostListener('document:pointerdown', ['$event']) onOutsidePointer(event: PointerEvent): void {
    const target = event.target;
    if (
      this.utilityOpen() &&
      target instanceof Node &&
      !this.profileButton?.nativeElement.parentElement?.contains(target)
    )
      this.closeUtility(false);
  }
  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set(null);
    this.closeUtility(false);
    this.closeDrawer(false);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    } catch {
      this.logoutError.set('We could not sign you out. Please try again.');
    } finally {
      this.loggingOut.set(false);
    }
  }
  private menuItems(): HTMLElement[] {
    return Array.from(this.document.querySelectorAll<HTMLElement>('#profile-menu [role="menuitem"]:not([disabled])'));
  }
  private firstMenuItem(): HTMLElement | undefined {
    return this.menuItems()[0];
  }
  private setPageScrollLocked(locked: boolean): void {
    this.document.body.classList.toggle('drawer-scroll-lock', locked);
  }
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : '';
}

function formatRole(role: UserRole): string {
  return role
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

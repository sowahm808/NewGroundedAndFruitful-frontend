import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({
  selector: 'gf-app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<div class="shell">
    <aside>
      <a class="brand" routerLink="/">Grounded <span>&amp; Fruitful</span></a>
      <nav aria-label="Main navigation">
        @for (item of links(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
        }
      </nav>
      <small>Grow with purpose.</small>
    </aside>
    <main><router-outlet /></main>
    <nav class="mobile" aria-label="Mobile navigation">
      @for (item of links().slice(0, 5); track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
      }
    </nav>
  </div>`,
  styles: [
    `
      .shell {
        min-height: 100dvh;
      }
      aside {
        position: fixed;
        inset: 0 auto 0 0;
        width: 230px;
        padding: 2rem 1.25rem;
        background: #244a37;
        color: #fff;
        display: flex;
        flex-direction: column;
      }
      .brand {
        font-size: 1.3rem;
        font-weight: 800;
        color: #fff;
        text-decoration: none;
      }
      .brand span {
        color: #ffd77a;
      }
      nav {
        display: grid;
        gap: 0.35rem;
        margin-top: 2rem;
      }
      nav a {
        color: inherit;
        text-decoration: none;
        padding: 0.75rem;
        border-radius: 0.6rem;
      }
      .active,
      nav a:hover {
        background: #ffffff1f;
      }
      small {
        margin-top: auto;
      }
      main {
        margin-left: 230px;
        padding: clamp(1rem, 4vw, 3rem);
        max-width: 1300px;
      }
      .mobile {
        display: none;
      }
      @media (max-width: 700px) {
        aside {
          position: static;
          width: auto;
          height: auto;
          padding: 1rem;
        }
        aside nav,
        aside small {
          display: none;
        }
        main {
          margin: 0;
          padding: 1rem 1rem 6rem;
        }
        .mobile {
          display: flex;
          position: fixed;
          z-index: 5;
          inset: auto 0 0;
          justify-content: space-around;
          margin: 0;
          padding: 0.5rem;
          background: #244a37;
          color: white;
        }
        .mobile a {
          font-size: 0.75rem;
          padding: 0.7rem 0.35rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly links = input.required<readonly { label: string; path: string }[]>();
}

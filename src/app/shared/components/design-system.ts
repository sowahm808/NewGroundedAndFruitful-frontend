import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'gf-button',
  standalone: true,
  template: `<button [type]="type()" [disabled]="disabled()" (click)="pressed.emit()"><ng-content /></button>`,
  styles: [
    `
      button {
        min-height: 44px;
        border: 0;
        border-radius: var(--radius-md);
        padding: 0.7rem 1rem;
        background: var(--brand);
        color: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      button:hover {
        background: var(--brand-dark);
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfButton {
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly pressed = output<void>();
}

@Component({
  selector: 'gf-card',
  standalone: true,
  template: `<section><ng-content /></section>`,
  styles: [
    `
      section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
        padding: var(--space-5);
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfCard {}

@Component({
  selector: 'gf-badge',
  standalone: true,
  template: `<span><ng-content /></span>`,
  styles: [
    `
      span {
        display: inline-flex;
        border-radius: 999px;
        background: var(--leaf-soft);
        color: var(--brand-dark);
        padding: 0.3rem 0.7rem;
        font-weight: 700;
        font-size: 0.8rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfBadge {}

@Component({
  selector: 'gf-progress',
  standalone: true,
  template: `<div class="labels">
      <span>{{ label() }}</span
      ><strong>{{ value() }}%</strong>
    </div>
    <div
      class="track"
      role="progressbar"
      [attr.aria-label]="label()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="value()"
    >
      <span [style.width.%]="value()"></span>
    </div>`,
  styles: [
    `
      .labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.45rem;
      }
      .track {
        height: 0.7rem;
        background: #e6e9e2;
        border-radius: 1rem;
        overflow: hidden;
      }
      .track span {
        display: block;
        height: 100%;
        background: var(--sun);
        border-radius: inherit;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfProgress {
  readonly value = input.required<number>();
  readonly label = input('Progress');
}

@Component({
  selector: 'gf-page-header',
  standalone: true,
  template: `<header>
    <div>
      <p>{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
      <ng-content />
    </div>
  </header>`,
  styles: [
    `
      header {
        margin-bottom: var(--space-6);
      }
      p {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--brand);
        font-weight: 800;
        margin: 0 0 0.35rem;
      }
      h1 {
        margin: 0;
        font-size: clamp(1.8rem, 5vw, 2.7rem);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfPageHeader {
  readonly title = input.required<string>();
  readonly eyebrow = input('Grounded & Fruitful');
}

@Component({
  selector: 'gf-loading',
  standalone: true,
  template: `<p role="status">Loading…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfLoading {}
@Component({
  selector: 'gf-empty-state',
  standalone: true,
  template: `<div>
    <strong>{{ title() }}</strong>
    <p>{{ message() }}</p>
  </div>`,
  styles: [
    `
      div {
        text-align: center;
        padding: 2rem;
        color: var(--muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfEmptyState {
  readonly title = input('Nothing here yet');
  readonly message = input('New items will appear here.');
}
@Component({
  selector: 'gf-alert',
  standalone: true,
  template: `<div role="alert">
    <strong>{{ title() }}</strong> <ng-content />
  </div>`,
  styles: [
    `
      div {
        padding: 1rem;
        border-radius: var(--radius-md);
        background: #fff4d8;
        border-left: 4px solid var(--sun);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfAlert {
  readonly title = input('Please note');
}
@Component({
  selector: 'gf-stat-card',
  standalone: true,
  imports: [GfCard],
  template: `<gf-card
    ><span>{{ label() }}</span
    ><strong>{{ value() }}</strong></gf-card
  >`,
  styles: [
    `
      span,
      strong {
        display: block;
      }
      span {
        color: var(--muted);
      }
      strong {
        font-size: 1.8rem;
        margin-top: 0.35rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GfStatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
}

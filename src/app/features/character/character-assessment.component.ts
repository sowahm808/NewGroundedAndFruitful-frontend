import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { GfAlert, GfButton, GfCard, GfPageHeader } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [GfAlert, GfButton, GfCard, GfPageHeader],
  template: `<gf-page-header title="Character Growth" eyebrow="Honest reflection"
      ><p>
        There are no “better” answers. Completing every reflection earns the same participation credit.
      </p></gf-page-header
    ><gf-alert title="Remember:">A 0 and a 10 are treated exactly the same for completion.</gf-alert>
    <p>
      <strong>{{ completed() }} of 5 completed</strong>
    </p>
    <div class="qualities">
      @for (q of qualities; track q.id; let i = $index) {
        <gf-card
          ><label [for]="q.id"
            ><strong>{{ q.name }}</strong
            ><span>{{ q.description }}</span></label
          ><input
            [id]="q.id"
            type="range"
            min="0"
            max="10"
            step="1"
            [value]="ratings()[i] ?? 5"
            (input)="rate(i, $event)"
          /><button type="button" (click)="rateValue(i, 0)">Choose 0</button
          ><button type="button" (click)="rateValue(i, 10)">Choose 10</button
          ><output>{{ ratings()[i] === null ? 'Not answered' : ratings()[i] }}</output></gf-card
        >
      }
    </div>
    <gf-button [disabled]="!complete()">Submit all reflections</gf-button>`,
  styles: [
    `
      .qualities {
        display: grid;
        gap: 1rem;
        margin: 1rem 0;
      }
      label span {
        display: block;
        color: var(--muted);
        margin: 0.4rem 0;
      }
      input {
        width: 100%;
        min-height: 44px;
      }
      button {
        margin-right: 0.5rem;
        padding: 0.5rem;
        background: white;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
      }
      output {
        float: right;
        font-weight: 800;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterAssessmentComponent {
  readonly qualities = [
    { id: 'kindness', name: 'Kindness', description: 'Showing care through words and actions.' },
    { id: 'courage', name: 'Courage', description: 'Taking a helpful step even when it feels hard.' },
    { id: 'patience', name: 'Patience', description: 'Waiting with calm and care.' },
    { id: 'honesty', name: 'Honesty', description: 'Choosing truth in words and actions.' },
    { id: 'responsibility', name: 'Responsibility', description: 'Caring for what has been trusted to you.' },
  ] as const;
  readonly ratings = signal<(number | null)[]>([null, null, null, null, null]);
  readonly completed = computed(() => this.ratings().filter((v) => v !== null).length);
  readonly complete = computed(() => this.completed() === 5);
  rate(index: number, event: Event): void {
    this.rateValue(index, Number((event.target as HTMLInputElement).value));
  }
  rateValue(index: number, value: number): void {
    this.ratings.update((r) => r.map((old, i) => (i === index ? value : old)));
  }
}

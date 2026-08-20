import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfCard, GfEmptyState, GfPageHeader, GfProgress } from '../../../shared/components/design-system';
import { ParentApi, ParticipationSummary } from '../parent-api.service';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfCard, GfEmptyState, GfPageHeader, GfProgress],
  template: `<gf-page-header title="Participation summary" eyebrow="Parent journey"
      ><p>Completion summaries shared for an active linked child.</p></gf-page-header
    ><gf-parent-child-scope (childChange)="load($event)" />
    @if (loaded() && !items().length) {
      <gf-empty-state title="No participation available" message="Participation will appear after it is calculated." />
    }
    <div class="cards">
      @for (item of items(); track item.period) {
        <gf-card
          ><h2>{{ item.period }}</h2>
          <gf-progress [value]="percent(item)" [label]="item.completed + ' of ' + item.available + ' completed'" />
          <p>Calculated {{ item.calculatedAt }}</p></gf-card
        >
      }
    </div>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentParticipationComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly items = signal<readonly ParticipationSummary[]>([]);
  readonly loaded = signal(false);
  load(id: string) {
    this.items.set([]);
    this.loaded.set(false);
    if (!id) return;
    this.api
      .participation(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((p) => {
        this.items.set(p.items);
        this.loaded.set(true);
      });
  }
  percent(i: ParticipationSummary) {
    return i.available ? Math.round((i.completed / i.available) * 100) : 0;
  }
}

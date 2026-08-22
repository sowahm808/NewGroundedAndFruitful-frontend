import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, ParentReport } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Reports" eyebrow="Parent journey"
      ><p>Report values are limited to the parent-safe backend contract.</p></gf-page-header
    ><gf-parent-child-scope (childChange)="load($event)" />
    @if (loading()) {
      <gf-loading />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p></gf-alert
      >
    }
    @if (!childId() && !loading()) {
      <gf-empty-state
        title="No linked children are available for this report."
        message="Reports require an active linked child."
      />
    }
    <div class="cards">
      @for (r of items(); track r.id) {
        <gf-card
          ><h2>{{ r.title }}</h2>
          <p>Status: {{ r.status }}</p>
          <p><strong>Calculated:</strong> {{ r.calculatedAt || 'Calculation time not supplied' }}</p></gf-card
        >
      }
    </div>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentReportsComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = signal('');
  readonly loading = signal(false);
  readonly error = signal<ViewError | null>(null);
  readonly items = signal<readonly ParentReport[]>([]);
  load(id: string) {
    this.childId.set(id);
    this.error.set(null);
    if (!id) return;
    this.loading.set(true);
    this.api
      .reports(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          this.items.set(p.items);
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
  }
  private fail(e: unknown) {
    this.error.set(parentViewError(e));
    this.loading.set(false);
  }
}

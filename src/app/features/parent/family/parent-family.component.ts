import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, FamilyActivity } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfAlert, GfCard, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Family activities" eyebrow="Parent journey"
      ><p>Complete configured activities once for an active linked child.</p></gf-page-header
    ><gf-parent-child-scope (childChange)="load($event)" />
    @if (loading()) {
      <gf-loading />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p></gf-alert
      >
    }
    <div class="cards">
      @for (a of items(); track a.id) {
        <gf-card
          ><h2>{{ a.title }}</h2>
          <p>{{ a.description }}</p>
          <p>Status: {{ a.status }}</p>
          <button type="button" (click)="complete(a)" [disabled]="a.status === 'completed' || busy() === a.id">
            {{ a.status === 'completed' ? 'Completed' : busy() === a.id ? 'Saving…' : 'Mark completed' }}
          </button></gf-card
        >
      }
    </div>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentFamilyComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = signal('');
  readonly loading = signal(false);
  readonly error = signal<ViewError | null>(null);
  readonly items = signal<readonly FamilyActivity[]>([]);
  readonly busy = signal('');
  load(id: string) {
    this.childId.set(id);
    this.error.set(null);
    if (!id) return;
    this.loading.set(true);
    this.api
      .family(id)
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
  complete(a: FamilyActivity) {
    const id = this.childId();
    if (!id || this.busy() || a.status === 'completed') return;
    this.busy.set(a.id);
    this.api
      .completeActivity(a.id, id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.items.update((xs) => xs.map((x) => (x.id === v.id ? v : x)));
          this.busy.set('');
        },
        error: (e) => {
          this.busy.set('');
          this.fail(e);
        },
      });
  }
}

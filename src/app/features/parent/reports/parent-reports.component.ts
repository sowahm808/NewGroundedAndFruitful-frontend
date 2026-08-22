import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, ParentReport } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
import { ParentContextStore } from '../parent-context.store';

type ReportsState =
  | { readonly status: 'initializing' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: readonly ParentReport[] }
  | { readonly status: 'empty' }
  | { readonly status: 'dependency_error'; readonly error: ViewError };
@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Reports" eyebrow="Parent journey"
      ><p>Report values are limited to the parent-safe backend contract.</p></gf-page-header
    ><gf-parent-child-scope (childChange)="load($event)" />
    @if (context.state().status === 'ready' && state().status === 'loading') {
      <gf-loading />
    } @else if (context.state().status === 'ready' && state().status === 'dependency_error') {
      @let e = reportError();
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p>
        <button type="button" (click)="retry()">Retry</button></gf-alert
      >
    } @else if (context.state().status === 'ready' && state().status === 'initializing') {
      <gf-empty-state
        title="Choose a linked child"
        message="Select an actively linked child to view their parent-safe report."
      />
    } @else if (context.state().status === 'ready' && state().status === 'empty') {
      <gf-empty-state title="No reports for this child" message="The server returned no reports for this selection." />
    } @else if (context.state().status === 'ready' && state().status === 'ready') {
      <div class="cards">
        @for (r of reportItems(); track r.id) {
          <gf-card
            ><h2>{{ r.title }}</h2>
            <p>Status: {{ r.status }}</p>
            <p><strong>Calculated:</strong> {{ r.calculatedAt || 'Calculation time not supplied' }}</p></gf-card
          >
        }
      </div>
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentReportsComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly context = inject(ParentContextStore);
  readonly childId = signal('');
  readonly state = signal<ReportsState>({ status: 'initializing' });
  readonly reportError = computed(() => {
    const state = this.state();
    return state.status === 'dependency_error'
      ? state.error
      : { title: 'Reports could not be loaded', message: 'Try again.' };
  });
  readonly reportItems = computed<readonly ParentReport[]>(() => {
    const state = this.state();
    return state.status === 'ready' ? state.data : [];
  });
  load(id: string) {
    this.childId.set(id);
    if (!id) {
      this.state.set({ status: 'initializing' });
      return;
    }
    this.state.set({ status: 'loading' });
    this.api
      .reports(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          this.state.set(p.items.length ? { status: 'ready', data: p.items } : { status: 'empty' });
        },
        error: (e) => this.fail(e),
      });
  }
  retry(): void {
    if (this.childId()) this.load(this.childId());
  }
  private fail(e: unknown) {
    this.state.set({ status: 'dependency_error', error: parentViewError(e) });
  }
}

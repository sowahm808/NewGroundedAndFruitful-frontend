import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { FamilyActivity, ParentApi } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Family Connection" eyebrow="Configured activities"
      ><p>Activities and completion state come from the program.</p></gf-page-header
    ><label
      >Linked child ID<input [formControl]="childId" /><button type="button" (click)="load()">
        Load activities
      </button></label
    >
    @if (loading()) {
      <gf-loading />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
      </gf-alert>
    }
    @if (!loading() && !items().length && !error()) {
      <gf-empty-state title="No family activities are available" message="Configured activities will appear here." />
    }
    <div class="cards">
      @for (a of items(); track a.id) {
        <gf-card
          ><h2>{{ a.title }}</h2>
          <p>{{ a.description }}</p>
          <p>Status: {{ a.status }}</p>
          @if (a.status !== 'completed') {
            <button type="button" (click)="complete(a)" [disabled]="busyId() === a.id">
              {{ busyId() === a.id ? 'Saving…' : 'Mark completed' }}
            </button>
          }
        </gf-card>
      }
    </div>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentFamilyComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = new FormControl('', { nonNullable: true });
  readonly items = signal<readonly FamilyActivity[]>([]);
  readonly loading = signal(false);
  readonly busyId = signal('');
  readonly error = signal<ViewError | null>(null);
  load() {
    this.loading.set(true);
    this.api
      .family(this.childId.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          this.items.set(p.items);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.loading.set(false);
        },
      });
  }
  complete(a: FamilyActivity) {
    if (this.busyId()) return;
    this.busyId.set(a.id);
    this.api
      .completeActivity(a.id, this.childId.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.items.update((all) => all.map((x) => (x.id === v.id ? v : x)));
          this.busyId.set('');
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.busyId.set('');
        },
      });
  }
}

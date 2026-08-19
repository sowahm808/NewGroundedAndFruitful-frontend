import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, ParentReport } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Reports" eyebrow="Participation and growth"
      ><p>Only reports made available by the program are shown.</p></gf-page-header
    ><label
      >Linked child ID<input [formControl]="childId" /><button type="button" (click)="load()">
        Load reports
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
      <gf-empty-state
        title="There is not enough data for a report yet"
        message="Available participation, reading, project, and team summaries will appear here."
      />
    }
    <div class="cards">
      @for (r of items(); track r.id) {
        <gf-card
          ><h2>{{ r.title }}</h2>
          <p>Status: {{ r.status }}</p>
          @if (r.availableAt) {
            <p>Available {{ r.availableAt }}</p>
          }
        </gf-card>
      }
    </div>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentReportsComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = new FormControl('', { nonNullable: true });
  readonly items = signal<readonly ParentReport[]>([]);
  readonly loading = signal(false);
  readonly error = signal<ViewError | null>(null);
  load() {
    this.loading.set(true);
    this.api
      .reports(this.childId.value)
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
}

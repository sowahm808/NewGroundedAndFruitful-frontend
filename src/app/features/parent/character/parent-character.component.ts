import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, CharacterCycle } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfAlert, GfCard, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Character cycle" eyebrow="Parent journey"
      ><p>Review and update configured qualities where the program authorizes changes.</p></gf-page-header
    ><gf-parent-child-scope (childChange)="load($event)" />
    @if (loading()) {
      <gf-loading />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p></gf-alert
      >
    }
    @if (cycle(); as c) {
      <p><strong>Quarter:</strong> {{ c.quarter || 'Not available' }}</p>
      <div class="cards">
        @for (q of c.qualities; track q.id) {
          <gf-card
            ><label
              ><input
                type="checkbox"
                [checked]="selected().includes(q.id)"
                [disabled]="!c.editable"
                (change)="toggle(q.id)"
              />
              {{ q.name }}</label
            >
            <p>{{ q.description }}</p></gf-card
          >
        }
      </div>
      @if (c.editable) {
        <button type="button" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save qualities' }}</button>
      } @else {
        <p>This configuration is read-only.</p>
      }
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentCharacterComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = signal('');
  readonly loading = signal(false);
  readonly error = signal<ViewError | null>(null);
  readonly cycle = signal<CharacterCycle | null>(null);
  readonly selected = signal<readonly string[]>([]);
  readonly busy = signal(false);
  load(id: string) {
    this.childId.set(id);
    this.error.set(null);
    if (!id) return;
    this.loading.set(true);
    this.api
      .character(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          this.cycle.set(c);
          this.selected.set(c.qualities.filter((q) => q.selected).map((q) => q.id));
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
  }
  private fail(e: unknown) {
    this.error.set(parentViewError(e));
    this.loading.set(false);
  }
  toggle(id: string) {
    this.selected.update((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }
  save() {
    const id = this.childId();
    if (!id || this.busy()) return;
    this.busy.set(true);
    this.api
      .saveCharacter(id, this.selected())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          this.cycle.set(c);
          this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.fail(e);
        },
      });
  }
}

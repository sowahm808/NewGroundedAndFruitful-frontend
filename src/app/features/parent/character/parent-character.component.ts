import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfButton, GfCard, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { CharacterCycle, ParentApi } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfButton, GfCard, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Character cycle" eyebrow="Parent"
      ><p>Review and update configured qualities for an authorized child.</p></gf-page-header
    ><label
      >Linked child ID <input [formControl]="childId" /><button type="button" (click)="load()">Load</button></label
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
    @if (cycle(); as c) {
      <p><strong>Quarter:</strong> {{ c.quarter || 'Not available' }}</p>
      <div class="cards">
        @for (q of c.qualities; track q.id) {
          <gf-card
            ><label
              ><input type="checkbox" [checked]="selected().includes(q.id)" (change)="toggle(q.id)" />
              <strong>{{ q.name }}</strong></label
            >
            <p>{{ q.description }}</p></gf-card
          >
        }
      </div>
      @if (c.editable) {
        <p>
          <gf-button [disabled]="saving()" (pressed)="save()">{{ saving() ? 'Saving…' : 'Save qualities' }}</gf-button>
        </p>
      }
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentCharacterComponent {
  private api = inject(ParentApi);
  private destroy = inject(DestroyRef);
  readonly childId = new FormControl('', { nonNullable: true });
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly cycle = signal<CharacterCycle | null>(null);
  readonly selected = signal<readonly string[]>([]);
  readonly error = signal<ViewError | null>(null);
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .character(this.childId.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          this.cycle.set(c);
          this.selected.set(c.qualities.filter((q) => q.selected).map((q) => q.id));
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.loading.set(false);
        },
      });
  }
  toggle(id: string) {
    this.selected.update((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }
  save() {
    if (this.saving()) return;
    this.saving.set(true);
    this.api
      .saveCharacter(this.childId.value, this.selected())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          this.cycle.set(c);
          this.saving.set(false);
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.saving.set(false);
        },
      });
  }
}

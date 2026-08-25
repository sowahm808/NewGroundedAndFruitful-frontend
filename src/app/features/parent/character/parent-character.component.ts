import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, finalize, forkJoin, map, Subscription } from 'rxjs';
import { GfAlert, GfCard, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import {
  CharacterQuality,
  CharacterSelection,
  ParentCharacterApi,
} from '../../../parent/services/parent-character-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfAlert, GfCard, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Character cycle" eyebrow="Parent journey"
      ><p>Review and update configured qualities where the program authorizes changes.</p></gf-page-header
    ><gf-parent-child-scope />
    @if (!childId()) {
      <p class="muted">Choose a linked child to manage their character qualities.</p>
    }
    @if (loading()) {
      <gf-loading label="Loading character qualities" />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p>
        @if (e.retryable) {
          <button type="button" class="secondary" (click)="loadSelection(childId())">Try again</button>
        }
      </gf-alert>
    }
    @if (selection(); as current) {
      <div class="cycle-heading">
        <div>
          <p class="muted">Current cycle</p>
          <h2>{{ current.quarterName || 'Character qualities' }}</h2>
        </div>
        <p aria-live="polite">
          <strong>{{ selectedQualityIds().length }} of {{ selectionLimit }} selected</strong>
        </p>
      </div>
      <p class="muted">Choose {{ selectionLimit }} qualities to focus on with your child this cycle.</p>
      <div class="cards" aria-label="Character quality selection">
        @for (q of qualities(); track q.id) {
          <gf-card [class.selected-quality]="selectedQualityIds().includes(q.id)"
            ><label class="quality-option"
              ><input
                type="checkbox"
                [checked]="selectedQualityIds().includes(q.id)"
                [disabled]="
                  !editable() ||
                  isSubmitting() ||
                  (!selectedQualityIds().includes(q.id) && selectedQualityIds().length >= selectionLimit)
                "
                (change)="toggle(q.id)"
              />
              <span>{{ q.name }}</span></label
            >
            @if (q.category) {
              <p class="quality-category">{{ q.category }}</p>
            }
            <p>{{ q.description }}</p></gf-card
          >
        } @empty {
          <gf-alert title="No qualities available"
            ><p>There are no character qualities configured for this cycle.</p></gf-alert
          >
        }
      </div>
      @if (editable()) {
        <button type="button" (click)="saveSelection()" [disabled]="!canSave()">
          {{ isSubmitting() ? 'Saving…' : 'Save selection' }}
        </button>
      } @else {
        <gf-alert title="Selection window closed"><p>This quarter's character selection is read-only.</p></gf-alert>
      }
      @if (saveSuccessAlert()) {
        <gf-alert title="Selection saved"><p>The character qualities were updated.</p></gf-alert>
      }
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentCharacterComponent implements OnInit {
  private readonly api = inject(ParentCharacterApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly childId = signal('');
  readonly loading = signal(false);
  readonly error = signal<ViewError | null>(null);
  readonly qualities = signal<readonly CharacterQuality[]>([]);
  readonly selection = signal<CharacterSelection | null>(null);
  readonly selectedQualityIds = signal<readonly string[]>([]);
  readonly currentVersion = signal(0);
  readonly isSubmitting = signal(false);
  readonly saveSuccessAlert = signal(false);
  readonly selectionLimit = 3;
  readonly editable = signal(false);
  private readonly savedQualityIds = signal<readonly string[]>([]);
  private loadRequest?: Subscription;
  readonly canSave = () =>
    !this.isSubmitting() &&
    this.editable() &&
    this.selectedQualityIds().length === this.selectionLimit &&
    !sameIds(this.selectedQualityIds(), this.savedQualityIds());
  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('child') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((childId) => {
        if (childId === this.childId()) return;
        this.childId.set(childId);
        this.loadSelection(childId);
      });
  }

  loadSelection(id: string): void {
    this.loadRequest?.unsubscribe();
    this.loadRequest = undefined;
    this.error.set(null);
    if (!id) {
      this.selection.set(null);
      this.qualities.set([]);
      this.selectedQualityIds.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadRequest = forkJoin({
      qualities: this.api.getQualities(),
      selection: this.api.getSelection(id),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ qualities, selection }) => {
          this.qualities.set(qualities);
          this.selection.set(selection);
          this.selectedQualityIds.set([...selection.selectedQualities]);
          this.savedQualityIds.set([...selection.selectedQualities]);
          this.currentVersion.set(selection.version);
          this.editable.set(true);
        },
        error: (e) => this.fail(e),
      });
  }
  private fail(e: unknown) {
    this.error.set(parentViewError(e));
    this.loading.set(false);
  }
  toggle(id: string) {
    if (!this.editable()) return;
    this.saveSuccessAlert.set(false);
    this.selectedQualityIds.update((values) =>
      values.includes(id)
        ? values.filter((value) => value !== id)
        : values.length < this.selectionLimit
          ? [...values, id]
          : values,
    );
  }
  saveSelection() {
    const id = this.childId();
    const selection = this.selection();
    if (!id || !selection || !this.canSave()) return;
    this.isSubmitting.set(true);
    this.error.set(null);
    this.api
      .saveSelection({
        childId: id,
        qualityIds: [...this.selectedQualityIds()],
        expectedVersion: this.currentVersion(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.selection.set(saved);
          this.currentVersion.set(saved.version);
          this.savedQualityIds.set([...saved.selectedQualities]);
          this.selectedQualityIds.set([...saved.selectedQualities]);
          this.isSubmitting.set(false);
          this.saveSuccessAlert.set(true);
        },
        error: (e) => {
          this.isSubmitting.set(false);
          this.fail(e);
        },
      });
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort().every((id, index) => id === [...right].sort()[index]);
}

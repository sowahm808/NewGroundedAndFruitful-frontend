import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, finalize, forkJoin, map, Subscription } from 'rxjs';
import { GfAlert, GfCard, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { CharacterQuality, CharacterSelection, ParentApi } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
import { ParentChildScopeComponent } from '../shared/parent-child-scope.component';
import { ParentContextStore } from '../parent-context.store';

@Component({
  standalone: true,
  imports: [ParentChildScopeComponent, GfAlert, GfCard, GfLoading, GfPageHeader],
  template: `
    <gf-page-header title="Character cycle" eyebrow="Parent journey">
      <p>Review and update configured qualities where the program authorizes changes.</p>
    </gf-page-header>

    <gf-parent-child-scope />

    @if (!childId()) {
      <p class="muted">Choose a linked child to manage their character qualities.</p>
    }

    @if (loading()) {
      <gf-loading />
    }

    @if (error(); as e) {
      <gf-alert [title]="e.title">
        <p>{{ e.message }}</p>
      </gf-alert>
    }

    @if (selection(); as current) {
      <h2>
        Quarter: {{ current.quarterName || current.quarterId || 'Current Quarter' }}
        @if (current.currentWeekNumber) {
          | Week {{ current.currentWeekNumber }}
        }
      </h2>

      <div class="cards" aria-label="Character quality selection">
        @for (q of qualities(); track q.id) {
          <gf-card>
            <label class="quality-option">
              <input
                type="checkbox"
                [checked]="selectedQualityIds().includes(q.id)"
                [disabled]="
                  !editable() ||
                  (!selectedQualityIds().includes(q.id) &&
                    selectedQualityIds().length >= selectionLimit())
                "
                (change)="toggle(q.id)"
              />
              <strong>{{ q.name }}</strong>
            </label>
            @if (q.description) {
              <p>{{ q.description }}</p>
            }
          </gf-card>
        }
      </div>

      <p>
        <strong>Selected:</strong> {{ selectedQualityIds().length }} / {{ selectionLimit() }}
      </p>

      @if (editable()) {
        <button
          type="button"
          class="gf-button gf-button--primary"
          (click)="saveSelection()"
          [disabled]="!canSave()"
        >
          {{ isSubmitting() ? 'Saving…' : 'Save Character Selection' }}
        </button>
      } @else {
        <gf-alert title="Selection window closed">
          <p>This quarter's character selection is read-only.</p>
        </gf-alert>
      }

      @if (saveSuccessAlert()) {
        <gf-alert title="Selection saved">
          <p>The character qualities were updated.</p>
        </gf-alert>
      }
    }
  `,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentCharacterComponent implements OnInit {
  private readonly api = inject(ParentApi);
  private readonly context = inject(ParentContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  readonly selectionLimit = signal(3);
  readonly editable = signal(false);

  private readonly savedQualityIds = signal<readonly string[]>([]);
  private loadRequest?: Subscription;

  readonly canSave = () =>
    !this.isSubmitting() &&
    this.editable() &&
    this.selectedQualityIds().length === this.selectionLimit() &&
    !sameIds(this.selectedQualityIds(), this.savedQualityIds());

  constructor() {
    // Automatically select the first linked child if no query param is present in URL
    effect(() => {
      const children = this.context.children();
      const currentParam =
        this.route.snapshot.queryParamMap.get('child') ||
        this.route.snapshot.queryParamMap.get('childId');

      if (!currentParam && children.length > 0 && !this.childId()) {
        const firstId = children[0].id;
        this.childId.set(firstId);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { child: firstId },
          queryParamsHandling: 'merge',
        });
        this.loadSelection(firstId);
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('child') || params.get('childId') || ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((childId) => {
        if (childId && childId !== this.childId()) {
          this.childId.set(childId);
          this.loadSelection(childId);
        }
      });
  }

  private loadSelection(id: string): void {
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
      qualities: this.api.characterQualities(),
      selection: this.api.characterSelection(id),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ qualities, selection }) => {
          this.qualities.set(qualities);
          this.selection.set(selection);
          const currentIds = selection.qualityIds || [];
          this.selectedQualityIds.set([...currentIds]);
          this.savedQualityIds.set([...currentIds]);
          this.currentVersion.set(selection.version || 1);
          this.selectionLimit.set(selection.selectionLimit ?? 3);
          this.editable.set(selection.editable !== false);
        },
        error: (e) => this.fail(e),
      });
  }

  private fail(e: unknown): void {
    this.error.set(parentViewError(e));
    this.loading.set(false);
  }

  toggle(id: string): void {
    if (!this.editable()) return;
    this.saveSuccessAlert.set(false);
    this.selectedQualityIds.update((values) =>
      values.includes(id)
        ? values.filter((value) => value !== id)
        : values.length < this.selectionLimit()
          ? [...values, id]
          : values,
    );
  }

 saveSelection(): void {
  const id = this.childId();
  const selection = this.selection();
  if (!id || !this.canSave()) return;

  // Resolve quarterId from current selection or the linked child's assigned quarter
  const linkedChild = this.context.children().find((c) => c.id === id);
  const rawQuarterId = selection?.quarterId?.trim() || linkedChild?.quarter?.id || linkedChild?.sourceQuarterId || '';

  this.isSubmitting.set(true);
  this.error.set(null);
  this.saveSuccessAlert.set(false);

  const payload: {
    childId: string;
    quarterId?: string;
    qualityIds: readonly string[];
    expectedVersion: number;
  } = {
    childId: id,
    qualityIds: this.selectedQualityIds(),
    expectedVersion: this.currentVersion(),
    ...(rawQuarterId ? { quarterId: rawQuarterId } : {}),
  };

  this.api
    .saveCharacterSelection(payload as { childId: string; quarterId: string; qualityIds: readonly string[]; expectedVersion: number })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (saved) => {
        this.selection.set(saved);
        this.currentVersion.set(saved.version);
        const savedIds = saved.qualityIds || [];
        this.savedQualityIds.set([...savedIds]);
        this.selectedQualityIds.set([...savedIds]);
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
  return (
    left.length === right.length &&
    [...left].sort().every((id, index) => id === [...right].sort()[index])
  );
}
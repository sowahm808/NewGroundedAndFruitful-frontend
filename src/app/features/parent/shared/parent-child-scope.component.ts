import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, inject, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';
import { ParentApi, ParentChild } from '../parent-api.service';

/** A relationship-safe child picker. IDs can only originate in the linked-child response. */
@Component({
  selector: 'gf-parent-child-scope',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="scope" aria-labelledby="relationship-scope-title">
    <h2 id="relationship-scope-title">Active relationship</h2>
    <label for="scope-search"
      >Find a linked child
      <input id="scope-search" type="search" [formControl]="search" autocomplete="off" />
    </label>
    <label for="scope-child"
      >View for
      <select id="scope-child" [formControl]="selection" [disabled]="loading()">
        <option value="">Choose a linked child</option>
        @for (child of children(); track child.id) {
          <option [value]="child.id">{{ child.displayName }}</option>
        }
      </select>
    </label>
    @if (hasMore()) {
      <button type="button" class="secondary" (click)="more()">Load more linked children</button>
    }
    <p class="muted" aria-live="polite">
      {{ loading() ? 'Checking active relationships…' : children().length + ' linked children shown' }}
    </p>
  </section>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildScopeComponent {
  private readonly api = inject(ParentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  @Output() readonly childChange = new EventEmitter<string>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly selection = new FormControl('', { nonNullable: true });
  readonly children = signal<readonly ParentChild[]>([]);
  readonly loading = signal(true);
  readonly hasMore = signal(false);
  private cursor = '';

  constructor() {
    this.search.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.loading.set(true)),
        switchMap((search) => this.api.children(search, 'active')),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (page) => {
          this.children.set(page.items);
          this.cursor = page.nextCursor ?? '';
          this.hasMore.set(page.hasMore);
          this.loading.set(false);
          this.restoreSafeSelection();
        },
        error: () => {
          this.children.set([]);
          this.loading.set(false);
          this.selection.setValue('');
        },
      });
    this.selection.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroy)).subscribe((id) => {
      const safeId = this.children().some((child) => child.id === id) ? id : '';
      if (safeId !== id) this.selection.setValue('', { emitEvent: false });
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { child: safeId || null, cursor: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.childChange.emit(safeId);
    });
  }
  more() {
    if (!this.cursor) return;
    this.api
      .children(this.search.value, 'active', this.cursor)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((page) => {
        this.children.update((items) => [...items, ...page.items]);
        this.cursor = page.nextCursor ?? '';
        this.hasMore.set(page.hasMore);
        this.restoreSafeSelection();
      });
  }
  private restoreSafeSelection() {
    const requested = this.route.snapshot.queryParamMap.get('child') ?? '';
    if (requested && this.children().some((child) => child.id === requested) && requested !== this.selection.value)
      this.selection.setValue(requested);
  }
}

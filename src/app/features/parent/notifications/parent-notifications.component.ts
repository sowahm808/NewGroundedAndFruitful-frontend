import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';
import { GfBadge, GfCard, GfEmptyState, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, ParentNotification } from '../parent-api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfBadge, GfCard, GfEmptyState, GfPageHeader],
  template: `<gf-page-header title="Notifications" eyebrow="Parent journey"
      ><p>Program notices for your authorized account.</p></gf-page-header
    >
    <form class="toolbar">
      <label>Search <input type="search" [formControl]="search" /></label
      ><label
        >Status
        <select [formControl]="status">
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select></label
      >
    </form>
    @if (loaded() && !items().length) {
      <gf-empty-state title="No notifications" message="New notices will appear here." />
    }
    <div class="cards">
      @for (n of items(); track n.id) {
        <gf-card
          ><gf-badge>{{ n.status }}</gf-badge>
          <h2>{{ n.title }}</h2>
          <p>{{ n.message }}</p>
          <p>{{ n.createdAt }}</p></gf-card
        >
      }
    </div>
    @if (hasMore()) {
      <button type="button" (click)="more()">Load more</button>
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentNotificationsComponent {
  private api = inject(ParentApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  readonly search = new FormControl(this.route.snapshot.queryParamMap.get('search') ?? '', { nonNullable: true });
  readonly status = new FormControl(
    this.route.snapshot.queryParamMap.get('status') === 'unread'
      ? 'unread'
      : this.route.snapshot.queryParamMap.get('status') === 'read'
        ? 'read'
        : '',
    { nonNullable: true },
  );
  readonly items = signal<readonly ParentNotification[]>([]);
  readonly hasMore = signal(false);
  readonly loaded = signal(false);
  private cursor = '';
  constructor() {
    combineLatest([
      this.search.valueChanges.pipe(startWith(this.search.value), debounceTime(300), distinctUntilChanged()),
      this.status.valueChanges.pipe(startWith(this.status.value), distinctUntilChanged()),
    ])
      .pipe(
        switchMap(([search, status]) => {
          this.cursor = '';
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { search: search || null, status: status || null, cursor: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
          return this.api.notifications(search, status);
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((p) => this.accept(p, false));
  }
  more() {
    if (!this.cursor) return;
    this.api
      .notifications(this.search.value, this.status.value, this.cursor)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((p) => this.accept(p, true));
  }
  private accept(p: { items: readonly ParentNotification[]; nextCursor?: string; hasMore: boolean }, append: boolean) {
    this.items.set(append ? [...this.items(), ...p.items] : p.items);
    this.cursor = p.nextCursor ?? '';
    this.hasMore.set(p.hasMore);
    this.loaded.set(true);
  }
}

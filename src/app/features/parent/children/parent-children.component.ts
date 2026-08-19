import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, debounceTime, distinctUntilChanged, startWith, Subject, switchMap, tap } from 'rxjs';
import {
  GfAlert,
  GfBadge,
  GfCard,
  GfEmptyState,
  GfPageHeader,
  GfProgress,
} from '../../../shared/components/design-system';
import { CursorPage, ParentApi, ParentChild } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfAlert, GfBadge, GfCard, GfEmptyState, GfPageHeader, GfProgress],
  template: `<gf-page-header title="Your children" eyebrow="Parent dashboard"
      ><p>Participation and progress shared with your authorized parent account.</p></gf-page-header
    >
    <form class="toolbar" aria-label="Filter children" (submit)="$event.preventDefault()">
      <label for="child-search"
        >Search <input id="child-search" type="search" [formControl]="search" autocomplete="off"
      /></label>
      <label for="child-status"
        >Status
        <select id="child-status" [formControl]="status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select></label
      >
      <button type="button" class="secondary" (click)="refresh()" [disabled]="loading()">Refresh</button>
    </form>
    <div aria-live="polite" class="muted">
      @if (refreshing()) {
        Refreshing children…
      }
    </div>
    @if (loading()) {
      <div class="cards" role="status" aria-label="Loading children">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
    }
    @if (error(); as failure) {
      <gf-alert class="error" [title]="failure.title"
        ><p>{{ failure.message }}</p>
        @if (failure.requestId) {
          <p>
            Support reference: <code>{{ failure.requestId }}</code>
          </p>
        }
        @if (failure.retryable) {
          <button type="button" (click)="refresh()">Try again</button>
        }
      </gf-alert>
    }
    @if (!loading() && !error() && children().length === 0) {
      <gf-empty-state
        title="No children are linked to your account yet."
        message="Contact a program administrator if you believe a child should be linked."
      />
    }
    @if (children().length) {
      <div class="cards">
        @for (child of children(); track child.id) {
          <gf-card
            ><gf-badge>{{ child.status }}</gf-badge>
            <h2>{{ child.displayName }}</h2>
            <ul class="meta">
              <li><strong>Team:</strong> {{ child.team?.name || 'Not assigned' }}</li>
              <li><strong>Quarter:</strong> {{ child.quarter?.name || 'Not available' }}</li>
              <li><strong>Reading:</strong> {{ child.readingProgress || 'Not available' }}</li>
              <li><strong>Project:</strong> {{ child.projectStatus || 'Not available' }}</li>
            </ul>
            @if (child.weeklyParticipation; as p) {
              <gf-progress
                [value]="percentage(p.completed, p.available)"
                [label]="'Weekly participation: ' + p.completed + ' of ' + p.available"
              />
            }
            @if (child.teamProgress; as p) {
              <gf-progress
                [value]="percentage(p.completed, p.target)"
                [label]="'Team progress: ' + p.completed + ' of ' + p.target"
              />
            }
            <p>
              <a
                [routerLink]="['/parent/children', child.id]"
                [attr.aria-label]="'Open details for ' + child.displayName"
                >Open {{ child.displayName }}’s details</a
              >
            </p></gf-card
          >
        }
      </div>
      @if (hasMore()) {
        <p>
          <button type="button" (click)="nextPage()" [disabled]="loadingMore()">
            {{ loadingMore() ? 'Loading…' : 'Load more' }}
          </button>
        </p>
      }
    } `,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildrenComponent {
  private readonly api = inject(ParentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();
  readonly search = new FormControl(this.route.snapshot.queryParamMap.get('search') ?? '', { nonNullable: true });
  readonly status = new FormControl(this.validStatus(this.route.snapshot.queryParamMap.get('status')), {
    nonNullable: true,
  });
  readonly children = signal<readonly ParentChild[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<ViewError | null>(null);
  readonly hasMore = signal(false);
  private cursor = '';
  constructor() {
    combineLatest([
      this.search.valueChanges.pipe(startWith(this.search.value), debounceTime(300), distinctUntilChanged()),
      this.status.valueChanges.pipe(startWith(this.status.value), distinctUntilChanged()),
      this.reload$.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(([search, status]) => {
          this.loading.set(this.children().length === 0);
          this.refreshing.set(this.children().length > 0);
          this.error.set(null);
          this.cursor = '';
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { search: search || null, status: status || null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }),
        switchMap(([search, status]) => this.api.children(search, status)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (p) => this.accept(p, false),
        error: (e) => {
          this.loading.set(false);
          this.refreshing.set(false);
          this.error.set(parentViewError(e));
        },
      });
  }
  refresh() {
    this.reload$.next();
  }
  nextPage() {
    if (!this.cursor) return;
    this.loadingMore.set(true);
    this.api
      .children(this.search.value, this.status.value, this.cursor)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => this.accept(p, true),
        error: (e) => {
          this.loadingMore.set(false);
          this.error.set(parentViewError(e));
        },
      });
  }
  percentage(value: number, total: number) {
    return total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  }
  private accept(page: CursorPage<ParentChild>, append: boolean) {
    this.children.set(append ? [...this.children(), ...page.items] : page.items);
    this.cursor = page.nextCursor ?? '';
    this.hasMore.set(page.hasMore);
    this.loading.set(false);
    this.refreshing.set(false);
    this.loadingMore.set(false);
  }
  private validStatus(value: string | null): '' | 'active' | 'pending' | 'inactive' {
    return value === 'active' || value === 'pending' || value === 'inactive' ? value : '';
  }
}

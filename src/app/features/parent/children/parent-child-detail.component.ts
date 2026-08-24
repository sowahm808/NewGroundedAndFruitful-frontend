import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfBadge, GfCard, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { ParentApi, ParentChild } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';
@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfBadge, GfCard, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Child overview" eyebrow="Linked child"
      ><p><a routerLink="/parent/children">← Back to children</a></p></gf-page-header
    >
    @if (loading()) {
      <gf-loading />
    }
    @if (error(); as e) {
      <gf-alert [title]="e.title"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>
            Support reference: <code>{{ e.requestId }}</code>
          </p>
        }
      </gf-alert>
    }
    @if (child(); as c) {
      <gf-card
        ><gf-badge>{{ c.status }}</gf-badge>
        <h2>{{ c.approvedDisplayName }}</h2>
        <p><strong>Team:</strong> {{ c.team?.displayName || 'Not assigned' }}</p>
        <p><strong>Quarter:</strong> {{ c.quarter?.displayName || 'Not available' }}</p>
        <p><strong>Reading:</strong> {{ c.readingProgress.completed }} of {{ c.readingProgress.assigned }} assigned</p>
        <p><strong>Project:</strong> {{ c.projectStatus || 'Not available' }}</p></gf-card
      >
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildDetailComponent {
  private api = inject(ParentApi);
  private route = inject(ActivatedRoute);
  private destroy = inject(DestroyRef);
  readonly loading = signal(true);
  readonly child = signal<ParentChild | null>(null);
  readonly error = signal<ViewError | null>(null);
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((p) => this.api.child(p.get('childId') ?? '')),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (c) => {
          this.child.set(c);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(parentViewError(e));
          this.loading.set(false);
        },
      });
  }
}

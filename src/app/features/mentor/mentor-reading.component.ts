import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader } from '../../shared/components/design-system';
import { MentorApi, MentorReview } from './mentor-api.service';
import { MentorViewError, mentorViewError } from './mentor-view.utilities';
@Component({
  standalone: true,
  imports: [GfAlert, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Reading summaries" eyebrow="Mentor"
      ><p>Approved reading progress for participants on your assigned teams.</p></gf-page-header
    >
    @if (loading()) {
      <gf-loading />
    } @else if (!items().length) {
      <gf-empty-state title="No reading summaries" message="Reading updates will appear here." />
    }
    <div class="cards">
      @for (item of items(); track item.id) {
        <gf-card
          ><h2>{{ item.participantName }}</h2>
          <p>{{ item.summary }}</p>
          <p><strong>Status:</strong> {{ item.status }}</p>
          <p class="meta">Updated {{ item.updatedAt }}</p></gf-card
        >
      }
    </div>
    @if (error(); as e) {
      <gf-alert title="Reading unavailable"
        ><p>{{ e.message }}</p></gf-alert
      >
    }`,
  styleUrl: './mentor-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorReadingComponent {
  private api = inject(MentorApi);
  private destroy = inject(DestroyRef);
  readonly items = signal<readonly MentorReview[]>([]);
  readonly loading = signal(true);
  readonly error = signal<MentorViewError | null>(null);
  constructor() {
    this.api
      .reading()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.items.set(v);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(mentorViewError(e));
          this.loading.set(false);
        },
      });
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  GfAlert,
  GfButton,
  GfCard,
  GfEmptyState,
  GfLoading,
  GfPageHeader,
} from '../../shared/components/design-system';
import { MentorApi, MentorNotification } from './mentor-api.service';
import { MentorViewError, mentorViewError } from './mentor-view.utilities';

@Component({
  standalone: true,
  imports: [GfAlert, GfButton, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `<gf-page-header title="Notifications and follow-up" eyebrow="Mentor">
      <p>Program notices for your assigned teams, with an explicit follow-up status.</p>
    </gf-page-header>
    @if (loading()) {
      <gf-loading />
    } @else if (!items().length) {
      <gf-empty-state title="No notifications" message="Assigned-team notices will appear here." />
    } @else {
      <div class="cards">
        @for (item of items(); track item.id) {
          <gf-card>
            <p class="meta">{{ item.status }} · {{ item.createdAt }}</p>
            <h2>{{ item.title }}</h2>
            <p>{{ item.message }}</p>
            <p><strong>Follow-up:</strong> {{ item.followUpStatus }}</p>
            @if (item.followUpStatus !== 'completed') {
              <gf-button type="button" [disabled]="updatingId() === item.id" (click)="complete(item.id)">
                {{ updatingId() === item.id ? 'Saving…' : 'Mark follow-up complete' }}
              </gf-button>
            }
          </gf-card>
        }
      </div>
    }
    @if (error(); as e) {
      <gf-alert title="Notifications unavailable"
        ><p>{{ e.message }}</p></gf-alert
      >
    }`,
  styleUrl: './mentor-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentorNotificationsComponent {
  private readonly api = inject(MentorApi);
  private readonly destroy = inject(DestroyRef);
  readonly items = signal<readonly MentorNotification[]>([]);
  readonly loading = signal(true);
  readonly updatingId = signal('');
  readonly error = signal<MentorViewError | null>(null);

  constructor() {
    this.api
      .notifications()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(mentorViewError(error));
          this.loading.set(false);
        },
      });
  }

  complete(id: string) {
    if (this.updatingId()) return;
    this.updatingId.set(id);
    this.api
      .updateNotificationFollowUp(id, 'completed')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (updated) => {
          this.items.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          this.updatingId.set('');
        },
        error: (error) => {
          this.error.set(mentorViewError(error));
          this.updatingId.set('');
        },
      });
  }
}

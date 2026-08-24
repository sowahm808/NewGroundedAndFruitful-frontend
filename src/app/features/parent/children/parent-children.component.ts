import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  GfAlert,
  GfBadge,
  GfCard,
  GfEmptyState,
  GfPageHeader,
  GfProgress,
} from '../../../shared/components/design-system';
import { ParentContextStore } from '../parent-context.store';

@Component({
  selector: 'gf-parent-children',
  standalone: true,
  imports: [RouterLink, GfAlert, GfBadge, GfCard, GfEmptyState, GfPageHeader, GfProgress],
  template: `
    <gf-page-header title="Your children" eyebrow="Parent dashboard">
      <p>Participation and progress shared with your authorized parent account.</p>
    </gf-page-header>

    <div class="parent-children-container" aria-live="polite">
      @switch (state().status) {
        @case ('loading') {
          <div class="cards" role="status" aria-label="Loading linked children">
            <div class="skeleton" aria-hidden="true"></div>
            <div class="skeleton" aria-hidden="true"></div>
          </div>
        }
        @case ('idle') {
          <div class="cards" role="status" aria-label="Loading linked children">
            <div class="skeleton" aria-hidden="true"></div>
            <div class="skeleton" aria-hidden="true"></div>
          </div>
        }
        @case ('forbidden') {
          <gf-alert title="Access denied">
            <p>Your account cannot access linked children in this workspace.</p>
          </gf-alert>
        }
        @case ('dependency_error') {
          <gf-alert title="Unable to load linked children">
            <p>The relationship service could not complete this request.</p>
            <button type="button" class="gf-button gf-button--secondary" (click)="context.retry()">Try again</button>
          </gf-alert>
        }
        @case ('contract_error') {
          <gf-alert title="Data format error">
            <p>The server response could not be reconciled with the application contract.</p>
            <button type="button" class="gf-button gf-button--secondary" (click)="context.retry()">Try again</button>
          </gf-alert>
        }
        @case ('empty') {
          <gf-empty-state
            title="No children are linked to your account yet."
            message="Contact a program administrator if you believe a child should be linked."
          />
        }
        @case ('ready') {
          @if (children().length === 0) {
            <gf-empty-state
              title="No children are linked to your account yet."
              message="Contact a program administrator if you believe a child should be linked."
            />
          } @else {
            <div class="cards">
              @for (child of children(); track child.id) {
                <gf-card>
                  <div class="card-header">
                    <gf-badge>
                      {{ child.status }}
                    </gf-badge>
                  </div>

                  <h2>{{ child.approvedDisplayName }}</h2>

                  <ul class="meta" aria-label="Child progress summary">
                    <li>
                      <strong>Team:</strong>
                      {{ child.team?.name || 'Not assigned' }}
                    </li>
                    <li>
                      <strong>Quarter:</strong>
                      {{ child.quarter?.name || 'Not available' }}
                    </li>
                    <li>
                      <strong>Reading:</strong>
                      {{ child.readingProgress || 'Not available' }}
                    </li>
                    <li>
                      <strong>Project:</strong>
                      {{ child.projectStatus || 'Not available' }}
                    </li>
                  </ul>

                  @if (child.weeklyParticipation; as p) {
                    <gf-progress
                      [value]="percentage(p.completed, p.available)"
                      [label]="'Weekly participation: ' + p.completed + ' of ' + p.available"
                    />
                  }

                  <div class="card-actions">
                    <a
                      [routerLink]="['/parent/children', child.id]"
                      class="gf-link"
                      [attr.aria-label]="'Open ' + child.approvedDisplayName + '’s details'"
                    >
                      Open {{ child.approvedDisplayName }}’s details &rarr;
                    </a>
                  </div>
                </gf-card>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildrenComponent {
  readonly context = inject(ParentContextStore);
  readonly state = computed(() => this.context.state());
  readonly children = computed(() => this.context.children());

  percentage(value: number, total: number): number {
    return total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  }
}

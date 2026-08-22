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
  standalone: true,
  imports: [RouterLink, GfAlert, GfBadge, GfCard, GfEmptyState, GfPageHeader, GfProgress],
  template: `<gf-page-header title="Your children" eyebrow="Parent dashboard">
      <p>Participation and progress shared with your authorized parent account.</p>
    </gf-page-header>
    @if (context.state().status === 'loading' || context.state().status === 'idle') {
      <div class="cards" role="status" aria-label="Loading children">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
    } @else if (context.state().status === 'empty') {
      <gf-empty-state
        title="No children are linked to your account yet."
        message="Contact a program administrator if you believe a child should be linked."
      />
    } @else if (context.state().status === 'forbidden') {
      <gf-alert title="Access denied"><p>Your account cannot access linked children in this workspace.</p></gf-alert>
    } @else if (context.state().status === 'dependency_error' || context.state().status === 'contract_error') {
      <gf-alert title="Unable to load linked children"
        ><p>The relationship service could not complete this request.</p>
        <button type="button" (click)="context.retry()">Try again</button></gf-alert
      >
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
            <p>
              <a [routerLink]="['/parent/children', child.id]">Open {{ child.displayName }}’s details</a>
            </p>
          </gf-card>
        }
      </div>
    }`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildrenComponent {
  readonly context = inject(ParentContextStore);
  readonly children = computed(() => this.context.children());
  percentage(value: number, total: number): number {
    return total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  }
}

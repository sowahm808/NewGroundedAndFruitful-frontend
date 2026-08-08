import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GfBadge, GfCard, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [GfBadge, GfCard, GfEmptyState, GfPageHeader],
  template: `<gf-page-header [title]="title" [eyebrow]="area"
      ><p>{{ description }}</p></gf-page-header
    >
    <div class="toolbar">
      <label>Search <input type="search" placeholder="Search records" /></label
      ><label
        >Status
        <select>
          <option>All statuses</option>
          <option>Active</option>
          <option>Completed</option>
        </select></label
      >
    </div>
    <div class="cards">
      @for (item of highlights; track item) {
        <gf-card
          ><gf-badge>Active</gf-badge>
          <h2>{{ item }}</h2>
          <p>Secure data appears here when your account is connected. Access is limited by backend authorization.</p>
          <button type="button">View details</button></gf-card
        >
      }
    </div>
    @if (highlights.length === 0) {
      <gf-empty-state title="Nothing to show yet" message="New records will appear here when available." />
    }`,
  styles: [
    `
      .toolbar {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }
      label {
        display: grid;
        gap: 0.3rem;
      }
      input,
      select {
        min-height: 44px;
        padding: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        gap: 1rem;
      }
      button {
        min-height: 44px;
        padding: 0.6rem;
        border: 1px solid var(--brand);
        color: var(--brand);
        background: white;
        border-radius: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = String(this.route.snapshot.data['title'] ?? 'Overview');
  readonly area = String(this.route.snapshot.data['area'] ?? 'Grounded & Fruitful');
  readonly description = String(this.route.snapshot.data['description'] ?? 'Encouraging progress, one step at a time.');
  readonly highlights = (this.route.snapshot.data['highlights'] as readonly string[] | undefined) ?? [];
}

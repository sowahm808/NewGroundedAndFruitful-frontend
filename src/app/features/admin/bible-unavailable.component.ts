import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GfAlert, GfCard, GfPageHeader } from '../../shared/components/design-system';

@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfCard, GfPageHeader],
  template: `
    <gf-page-header [title]="title" eyebrow="Bible administration · contract unavailable">
      <p>
        Bible content stays unavailable until the backend publishes the trusted administration contract. No files,
        previews, answers, or lifecycle commands are handled in this browser.
      </p>
    </gf-page-header>
    <gf-alert title="Backend contract required">
      <p>
        The deployed OpenAPI document could not be obtained and does not exist in this repository. Creating controls now
        would require inventing security-sensitive paths or payloads.
      </p>
    </gf-alert>
    <div class="contract-grid">
      <gf-card>
        <h2>This page is safely gated</h2>
        <p>{{ consequence }}</p>
        <p>Existing content is not represented as empty, and no mock quiz is substituted.</p>
      </gf-card>
      <gf-card>
        <h2>Contract needed to enable it</h2>
        <ul>
          <li>Generated operation IDs and separate admin/child response schemas</li>
          <li>Multipart limits and exact field names</li>
          <li>Import statuses, validation, correction, commit, publish, and archive commands</li>
          <li>Authorization, error codes, pagination, versioning, and idempotency behavior</li>
        </ul>
      </gf-card>
    </div>
    <p class="actions">
      <a routerLink="/admin/bible">Bible administration</a> <a routerLink="/admin/quarters">Return to quarters</a>
    </p>
  `,
  styles: [
    `
      .contract-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
        gap: var(--space-5);
        margin: var(--space-5) 0;
      }
      h2 {
        margin-top: 0;
      }
      li + li {
        margin-top: 0.55rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleUnavailableComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly view = (this.route.snapshot.data['bibleView'] as string | undefined) ?? 'library';
  readonly title =
    this.view === 'new-import'
      ? 'Create Bible import'
      : this.view === 'import-review'
        ? 'Review Bible import'
        : this.view === 'content-review'
          ? 'Review Bible content set'
          : 'Bible content';
  readonly consequence =
    this.view === 'new-import'
      ? 'Question and answer-key documents cannot be uploaded until the authoritative multipart contract and file limits are published.'
      : this.view === 'import-review'
        ? 'Import preview, correction, validation, and commit cannot be requested until their versioned operations are published.'
        : this.view === 'content-review'
          ? 'Draft review and explicit publication cannot be requested until their lifecycle operations are published.'
          : 'The content list and lifecycle actions cannot be requested until their list, filtering, pagination, and command contracts are published.';
}

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ParentApi, ParentChild } from '../parent-api.service';
import { parentViewError, ViewError } from '../parent-view.utilities';

@Component({
  selector: 'gf-parent-children',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, GfAlert, GfBadge, GfCard, GfEmptyState, GfPageHeader, GfProgress],
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
                      {{ child.team?.displayName || 'Not assigned' }}
                    </li>
                    <li>
                      <strong>Quarter:</strong>
                      {{ child.quarter?.displayName || 'Not available' }}
                    </li>
                    <li>
                      <strong>Reading:</strong>
                      {{ child.readingProgress.completed }} of {{ child.readingProgress.assigned }} assigned
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
                    <button type="button" class="secondary" (click)="openPinModal(child)">🔑 Manage Login PIN</button>
                  </div>
                </gf-card>
              }
            </div>
          }
        }
      }
    </div>
    @if (credentialSuccess(); as message) {
      <gf-alert title="Credentials updated"
        ><p>{{ message }}</p></gf-alert
      >
    }
    @if (pinChild(); as child) {
      <div class="modal-overlay" role="presentation" (click)="closePinModal()">
        <section
          class="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-modal-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="pin-modal-title">Manage Login PIN for {{ child.approvedDisplayName }}</h2>
          <p class="muted">The child will use this handle and PIN at the child login screen.</p>
          @if (modalError(); as failure) {
            <gf-alert [title]="failure.title"
              ><p>{{ failure.message }}</p></gf-alert
            >
          }
          <form [formGroup]="pinForm" (ngSubmit)="saveCredentials()">
            <label for="child-handle"
              >Child handle
              <input id="child-handle" formControlName="handle" autocomplete="username" inputmode="text" />
            </label>
            <label for="child-pin"
              >PIN
              <input
                id="child-pin"
                type="password"
                formControlName="pin"
                inputmode="numeric"
                maxlength="6"
                autocomplete="new-password"
              />
            </label>
            <label for="child-pin-confirm"
              >Confirm PIN
              <input
                id="child-pin-confirm"
                type="password"
                formControlName="confirmPin"
                inputmode="numeric"
                maxlength="6"
                autocomplete="new-password"
              />
            </label>
            @if (pinForm.controls.pin.touched && pinForm.controls.pin.invalid) {
              <p class="form-error" role="alert">Enter a 4–6 digit numeric PIN.</p>
            }
            @if (pinMismatch()) {
              <p class="form-error" role="alert">The PINs do not match.</p>
            }
            <div class="modal-actions">
              <button type="button" class="secondary" (click)="closePinModal()">Cancel</button>
              <button type="submit" [disabled]="pinForm.invalid || pinMismatch() || credentialBusy()">
                {{ credentialBusy() ? 'Saving…' : 'Save credentials' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    }
  `,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildrenComponent {
  readonly context = inject(ParentContextStore);
  private readonly api = inject(ParentApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = computed(() => this.context.state());
  readonly children = computed(() => this.context.children());
  readonly pinChild = signal<ParentChild | null>(null);
  readonly credentialBusy = signal(false);
  readonly credentialSuccess = signal('');
  readonly modalError = signal<ViewError | null>(null);
  readonly pinForm = new FormGroup({
    handle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9]+$/)],
    }),
    pin: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4,6}$/)] }),
    confirmPin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly pinMismatch = () =>
    this.pinForm.controls.confirmPin.touched &&
    this.pinForm.controls.pin.value !== this.pinForm.controls.confirmPin.value;

  percentage(value: number, total: number): number {
    return total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  }

  openPinModal(child: ParentChild): void {
    const suggestedHandle = (child.handle || child.approvedDisplayName).toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
    this.pinForm.reset({ handle: suggestedHandle, pin: '', confirmPin: '' });
    this.modalError.set(null);
    this.credentialSuccess.set('');
    this.pinChild.set(child);
  }

  closePinModal(): void {
    if (!this.credentialBusy()) this.pinChild.set(null);
  }

  saveCredentials(): void {
    this.pinForm.markAllAsTouched();
    const child = this.pinChild();
    if (!child || this.pinForm.invalid || this.pinMismatch() || this.credentialBusy()) return;
    this.credentialBusy.set(true);
    this.modalError.set(null);
    const { handle, pin } = this.pinForm.getRawValue();
    this.api
      .setChildCredentials(child.id, { handle, pin })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.credentialBusy.set(false);
          this.pinChild.set(null);
          this.credentialSuccess.set(
            `Login credentials for ${child.approvedDisplayName} were updated. Handle: ${result.handle}`,
          );
        },
        error: (error: unknown) => {
          this.credentialBusy.set(false);
          this.modalError.set(parentViewError(error));
        },
      });
  }
}

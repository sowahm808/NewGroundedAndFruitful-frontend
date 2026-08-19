import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfCard, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { ChildApi, newIdempotencyKey, Project } from './child-api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GfAlert, GfCard, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Projects" eyebrow="Ideas into action"
      ><p>Project stages move forward through backend-approved updates.</p></gf-page-header
    ><gf-card
      ><h2>Start a project idea</h2>
      <form [formGroup]="form" (ngSubmit)="create()">
        <label class="field"><span>Title</span><input formControlName="title" /></label
        ><label class="field"><span>Your idea</span><textarea formControlName="idea"></textarea></label
        ><button [disabled]="form.invalid || busy()">Create project</button>
      </form></gf-card
    >
    <h2>Your projects</h2>
    @if (error()) {
      <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert>
    } @else if (loading()) {
      <p role="status">Loading projects…</p>
    } @else if (!projects().length) {
      <gf-empty-state title="No projects yet" message="Use your first idea to begin a project." />
    } @else {
      <div class="stack">
        @for (p of projects(); track p.id) {
          <gf-card
            ><h3>{{ p.title }}</h3>
            <p>Stage: {{ p.stage }}</p>
            @if (p.mentorGuidance) {
              <h4>Mentor guidance</h4>
              <p>{{ p.mentorGuidance }}</p>
            }
            <p>{{ p.idea }}</p>
            <h4>Milestones</h4>
            <ul>
              @for (m of p.milestones; track m.id) {
                <li>{{ m.completed ? 'Complete' : 'Open' }} — {{ m.title }}</li>
              }
            </ul></gf-card
          >
        }
      </div>
    }
    <p role="status" aria-live="polite">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectComponent implements OnInit {
  private api = inject(ChildApi);
  readonly projects = signal<readonly Project[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    idea: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(5000)] }),
  });
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.projects().subscribe({
      next: (p) => {
        this.projects.set(p.items);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Projects could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  create() {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.api.createProject(this.form.getRawValue(), newIdempotencyKey()).subscribe({
      next: (p) => {
        this.projects.update((x) => [p, ...x]);
        this.form.reset();
        this.message.set('Project created.');
        this.busy.set(false);
      },
      error: (e) => {
        this.message.set(e instanceof ApiError ? e.message : 'Project could not be created.');
        this.busy.set(false);
      },
    });
  }
}

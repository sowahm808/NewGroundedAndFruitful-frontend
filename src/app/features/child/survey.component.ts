import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { GfAlert, GfEmptyState, GfPageHeader } from '../../shared/components/design-system';
import { ChildApi, Survey, SurveyAnswer, newIdempotencyKey } from './child-api.service';

type AnswerForm = FormGroup<{
  questionId: FormControl<string>;
  value: FormControl<string | boolean | null>;
}>;

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GfAlert, GfEmptyState, GfPageHeader],
  styleUrl: './child-feature.scss',
  template: `<gf-page-header title="Survey" eyebrow="Your voice"><p>Your answers are submitted privately.</p></gf-page-header>
    @if (loading()) { <p role="status">Loading survey…</p> }
    @else if (error()) { <gf-alert [title]="error()!"><button (click)="load()">Try again</button></gf-alert> }
    @else if (survey(); as current) {
      @if (current.status === 'completed' || current.status === 'locked') {
        <gf-empty-state title="Survey complete" message="Your response has already been submitted." />
      } @else {
        <h2>{{ current.title }}</h2><p>{{ current.privacyNotice }}</p>
        <form [formGroup]="form" (ngSubmit)="submit(true)">
          <div formArrayName="answers" class="stack">
            @for (group of answers.controls; track group.controls.questionId.value; let i = $index) {
              @let question = current.questions[i];
              <fieldset [formGroupName]="i"><legend>{{ question.prompt }} {{ question.required ? '(required)' : '(optional)' }}</legend>
                @switch (question.type) {
                  @case ('text') { <textarea formControlName="value"></textarea> }
                  @case ('boolean') {
                    <label><input type="radio" formControlName="value" [value]="true" /> Yes</label>
                    <label><input type="radio" formControlName="value" [value]="false" /> No</label>
                  }
                  @case ('single_choice') {
                    @for (option of question.options; track option.id) {
                      <label><input type="radio" formControlName="value" [value]="option.id" /> {{ option.label }}</label>
                    }
                  }
                }
                @if (group.controls.value.invalid && group.controls.value.touched) { <p class="error">Answer this question.</p> }
              </fieldset>
            }
          </div>
          <div class="actions">
            @if (current.supportsDraft) { <button type="button" class="secondary" [disabled]="busy()" (click)="submit(false)">Save draft</button> }
            <button type="submit" [disabled]="busy()">Submit survey</button>
          </div>
        </form>
      }
    }
    <p role="status" aria-live="polite">{{ message() }}</p><a routerLink="/child/more">Back to activities</a>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyComponent implements OnInit {
  private readonly api = inject(ChildApi);
  private readonly route = inject(ActivatedRoute);
  readonly survey = signal<Survey | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly form = new FormGroup({ answers: new FormArray<AnswerForm>([]) });
  private key = newIdempotencyKey();
  get answers() { return this.form.controls.answers; }
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set(null);
    this.api.survey(this.route.snapshot.paramMap.get('surveyId') ?? '').subscribe({
      next: (survey) => {
        this.survey.set(survey); this.answers.clear();
        survey.questions.forEach((question) => this.answers.push(new FormGroup({
          questionId: new FormControl(question.id, { nonNullable: true }),
          value: new FormControl<string | boolean | null>(null, question.required ? Validators.required : []),
        })));
        this.loading.set(false);
      },
      error: (error) => { this.error.set(error instanceof ApiError ? error.message : 'Survey could not be loaded.'); this.loading.set(false); },
    });
  }
  submit(final: boolean) {
    if (this.busy()) return;
    if (final) { this.form.markAllAsTouched(); if (this.form.invalid) return; }
    const survey = this.survey(); if (!survey) return;
    const answers: SurveyAnswer[] = this.answers.controls
      .filter((answer) => answer.controls.value.value !== null && answer.controls.value.value !== '')
      .map((answer) => ({ questionId: answer.controls.questionId.value, value: answer.controls.value.value! }));
    this.busy.set(true);
    this.api.submitSurvey(survey.id, answers, final, this.key).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (updated) => { this.survey.set(updated); this.message.set(final ? 'Survey submitted.' : 'Draft saved.'); if (final) this.key = newIdempotencyKey(); },
      error: (error) => this.message.set(error instanceof ApiError ? error.message : 'Survey response could not be saved.'),
    });
  }
}

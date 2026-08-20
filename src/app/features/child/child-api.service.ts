import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';
import { buildHttpParams } from '../../core/http/http-params';

export type ActivityStatus = 'not_configured' | 'available' | 'draft' | 'completed' | 'locked';
export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
  readonly timezone: string;
  readonly calculatedAt?: string;
}
export interface QuarterSummary {
  readonly id: string;
  readonly name: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly week: number;
  readonly totalWeeks: number;
  readonly startsOn?: string;
  readonly endsOn?: string;
}
export interface RecognitionSummary {
  readonly count: number;
  readonly latestLabel?: string;
}
export interface TodaySummary {
  readonly quarter?: QuarterSummary;
  readonly activities: Readonly<
    Record<'checkIn' | 'gratitude' | 'character' | 'bible' | 'reading' | 'project', ActivityStatus>
  >;
  readonly individualContribution: number;
  readonly team: {
    readonly name: string;
    readonly compositePoints: number;
    readonly target: number;
    readonly progressPercent: number;
  };
  readonly calculatedAt: string;
  readonly recognition?: RecognitionSummary;
}
export interface CheckIn {
  readonly status: ActivityStatus;
  readonly version: number;
  readonly feelings?: string;
  readonly mind?: string;
  readonly privateNote?: string;
  readonly locksOnCompletion: boolean;
}
export interface CheckInCommand {
  readonly feelings: string;
  readonly mind: string;
  readonly privateNote?: string;
  readonly version: number;
}
export interface GratitudeEntry {
  readonly id: string;
  readonly localDate: string;
  readonly text: string;
  readonly status: 'draft' | 'completed';
}
export interface CharacterQuality {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}
export interface CharacterResponse {
  readonly qualityId: string;
  readonly rating: number;
  readonly reflection?: string;
}
export interface CharacterCycle {
  readonly id: string;
  readonly status: ActivityStatus;
  readonly qualities: readonly CharacterQuality[];
  readonly responses: readonly CharacterResponse[];
  readonly version: number;
}
export interface CharacterResult {
  readonly status: 'completed';
  readonly participationAward?: { readonly label: string; readonly points: number };
  readonly calculatedAt: string;
}
export interface ReadingSummary {
  readonly book?: {
    readonly id: string;
    readonly title: string;
    readonly author?: string;
    readonly description?: string;
  };
  readonly assignments: readonly ReadingAssignment[];
  readonly calculatedAt: string;
}
export interface ReadingAssignment {
  readonly id: string;
  readonly week: number;
  readonly title: string;
  readonly instructions: string;
  readonly status: ActivityStatus;
  readonly responses: readonly ReadingResponse[];
  readonly media?: MediaPolicy;
}
export interface MediaPolicy {
  readonly allowedMimeTypes: readonly string[];
  readonly maximumBytes: number;
  readonly uploadTargetEndpoint: string;
  readonly captionsRequired: boolean;
}
export interface MediaReference {
  readonly id: string;
  readonly mimeType: string;
  readonly size: number;
}
export interface ReadingResponse {
  readonly id: string;
  readonly text?: string;
  readonly media?: MediaReference;
  readonly transcript?: string;
  readonly submittedAt: string;
}
export type ProjectStage = 'idea' | 'goal' | 'guidance' | 'plan' | 'action' | 'progress' | 'reflection' | 'completion';
export interface Project {
  readonly id: string;
  readonly title: string;
  readonly stage: ProjectStage;
  readonly version: number;
  readonly idea?: string;
  readonly goal?: string;
  readonly plan?: string;
  readonly reflection?: string;
  readonly mentorGuidance?: string;
  readonly milestones: readonly Milestone[];
  readonly updatedAt: string;
}
export interface Milestone {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}
export interface TeamView {
  readonly name: string;
  readonly quarter: string;
  readonly compositePoints: number;
  readonly target: number;
  readonly progressPercent: number;
  readonly calculatedAt: string;
  readonly recognition?: readonly Pick<Award, 'id' | 'name' | 'description' | 'issuedDate'>[];
}
export interface SpecialActivity {
  readonly id: string;
  readonly title: string;
  readonly instructions: string;
  readonly eligible: boolean;
  readonly status: ActivityStatus;
  readonly availableFrom?: string;
  readonly availableUntil?: string;
}
export type SurveyQuestion = { readonly id: string; readonly prompt: string; readonly required: boolean } & (
  | { readonly type: 'text' }
  | { readonly type: 'single_choice'; readonly options: readonly { readonly id: string; readonly label: string }[] }
  | { readonly type: 'boolean' }
);
export interface SurveySummary {
  readonly id: string;
  readonly title: string;
  readonly status: ActivityStatus;
}
export interface Survey extends SurveySummary {
  readonly privacyNotice: string;
  readonly questions: readonly SurveyQuestion[];
  readonly supportsDraft: boolean;
}
export interface SurveyAnswer {
  readonly questionId: string;
  readonly value: string | boolean;
}
export interface PointEntry {
  readonly id: string;
  readonly sourceLabel: string;
  readonly amount: number;
  readonly date: string;
  readonly quarter: string;
  readonly adjustment: boolean;
  readonly reversesEntryId?: string;
  readonly adjustedEntryId?: string;
}
export interface PointHistory extends CursorPage<PointEntry> {
  readonly quarterTotals?: readonly { readonly quarter: string; readonly total: number }[];
}
export interface Award {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly issuedDate?: string;
  readonly quarter: string;
  readonly status: 'eligible' | 'issued' | 'revoked';
}

@Injectable({ providedIn: 'root' })
export class ChildApi {
  private readonly api = inject(ApiClient);
  today(): Observable<TodaySummary> {
    return this.api.getData('/child/today');
  }
  checkIn(): Observable<CheckIn> {
    return this.api.getData('/child/check-ins/today');
  }
  saveCheckIn(command: CheckInCommand): Observable<CheckIn> {
    return this.api.putData('/child/check-ins/today/draft', command);
  }
  completeCheckIn(command: CheckInCommand, key: string): Observable<CheckIn> {
    return this.api.postData('/child/check-ins/today/complete', command, this.idempotent(key));
  }
  gratitude(cursor = ''): Observable<CursorPage<GratitudeEntry>> {
    return this.api.getData('/child/gratitude', { params: buildHttpParams({ cursor }) });
  }
  submitGratitude(text: string, key: string): Observable<GratitudeEntry> {
    return this.api.postData('/child/gratitude', { text }, this.idempotent(key));
  }
  character(): Observable<CharacterCycle> {
    return this.api.getData('/child/character');
  }
  saveCharacter(responses: readonly CharacterResponse[], version: number): Observable<CharacterCycle> {
    return this.api.putData('/child/character/draft', { responses, version });
  }
  completeCharacter(
    responses: readonly CharacterResponse[],
    version: number,
    key: string,
  ): Observable<CharacterResult> {
    return this.api.postData('/child/character/complete', { responses, version }, this.idempotent(key));
  }
  reading(): Observable<ReadingSummary> {
    return this.api.getData('/child/reading');
  }
  readingAssignment(id: string): Observable<ReadingAssignment> {
    return this.api.getData(`/child/reading/${encodeURIComponent(id)}`);
  }
  submitReading(
    id: string,
    command: { readonly text?: string; readonly media?: MediaReference; readonly transcript?: string },
    key: string,
  ): Observable<ReadingResponse> {
    return this.api.postData(`/child/reading/${encodeURIComponent(id)}/responses`, command, this.idempotent(key));
  }
  projects(): Observable<CursorPage<Project>> {
    return this.api.getData('/child/projects');
  }
  createProject(command: { readonly title: string; readonly idea: string }, key: string): Observable<Project> {
    return this.api.postData('/child/projects', command, this.idempotent(key));
  }
  project(id: string): Observable<Project> {
    return this.api.getData(`/child/projects/${encodeURIComponent(id)}`);
  }
  updateProject(
    id: string,
    command: Readonly<Partial<Pick<Project, 'title' | 'idea' | 'goal' | 'plan' | 'reflection'>>> & {
      readonly version: number;
    },
  ): Observable<Project> {
    return this.api.patchData(`/child/projects/${encodeURIComponent(id)}`, command);
  }
  addMilestone(id: string, title: string, version: number, key: string): Observable<Project> {
    return this.api.postData(
      `/child/projects/${encodeURIComponent(id)}/milestones`,
      { title, version },
      this.idempotent(key),
    );
  }
  updateProjectStage(
    id: string,
    stage: ProjectStage,
    version: number,
    milestoneId: string | undefined,
    key: string,
  ): Observable<Project> {
    return this.api.postData(
      `/child/projects/${encodeURIComponent(id)}/updates`,
      { stage, version, milestoneId },
      this.idempotent(key),
    );
  }
  team(): Observable<TeamView> {
    return this.api.getData('/child/team');
  }
  specialActivities(): Observable<readonly SpecialActivity[]> {
    return this.api.getData('/child/special-activities');
  }
  completeSpecialActivity(id: string, key: string): Observable<SpecialActivity> {
    return this.api.postData(`/child/special-activities/${encodeURIComponent(id)}/complete`, {}, this.idempotent(key));
  }
  surveys(): Observable<readonly SurveySummary[]> {
    return this.api.getData('/child/surveys');
  }
  survey(id: string): Observable<Survey> {
    return this.api.getData(`/child/surveys/${encodeURIComponent(id)}`);
  }
  submitSurvey(id: string, answers: readonly SurveyAnswer[], final: boolean, key: string): Observable<Survey> {
    return this.api.postData(
      `/child/surveys/${encodeURIComponent(id)}/responses`,
      { answers, final },
      this.idempotent(key),
    );
  }
  points(cursor = ''): Observable<PointHistory> {
    return this.api.getData('/child/points', { params: buildHttpParams({ cursor }) });
  }
  awards(): Observable<{ readonly items: readonly Award[]; readonly calculatedAt: string }> {
    return this.api.getData('/child/awards');
  }
  private idempotent(key: string) {
    return { headers: { 'Idempotency-Key': key } } as const;
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
export function validatePrivateMedia(file: Pick<File, 'type' | 'size'>, policy: MediaPolicy): string | null {
  if (!policy.allowedMimeTypes.includes(file.type)) return 'This file type is not supported.';
  if (file.size > policy.maximumBytes) return `Choose a file smaller than ${policy.maximumBytes} bytes.`;
  return null;
}

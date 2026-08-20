import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/http/api-client.service';

export interface MentorTeamSummary {
  readonly id: string;
  readonly name: string;
  readonly quarter: string;
  readonly participantCount: number;
  readonly participationStatus: string;
  readonly progress: { readonly completed: number; readonly target: number; readonly percent: number };
}
export interface MentorParticipantSummary {
  readonly id: string;
  readonly displayName: string;
  readonly participationStatus: string;
  readonly readingSummary: string;
  readonly projectSummary: string;
}
export interface ApprovedMentorNote {
  readonly id: string;
  readonly body: string;
  readonly approvedAt: string;
}
export interface MentorTeamDetail extends MentorTeamSummary {
  readonly participants: readonly MentorParticipantSummary[];
  readonly approvedNotes: readonly ApprovedMentorNote[];
  readonly calculatedAt: string;
}
export interface MentorReview {
  readonly id: string;
  readonly teamId: string;
  readonly participantId: string;
  readonly participantName: string;
  readonly summary: string;
  readonly status: string;
  readonly updatedAt: string;
}
export interface MentorRecipient {
  readonly id: string;
  readonly displayName: string;
  readonly teamName: string;
}

@Injectable({ providedIn: 'root' })
export class MentorApi {
  private readonly api = inject(ApiClient);
  teams(): Observable<readonly MentorTeamSummary[]> {
    return this.api.getData('/mentor/teams');
  }
  team(teamId: string): Observable<MentorTeamDetail> {
    return this.api.getData(`/mentor/teams/${encodeURIComponent(teamId)}`);
  }
  reading(): Observable<readonly MentorReview[]> {
    return this.api.getData('/mentor/reading');
  }
  projects(): Observable<readonly MentorReview[]> {
    return this.api.getData('/mentor/projects');
  }
  addGuidance(reviewId: string, guidance: string): Observable<MentorReview> {
    return this.api.postData(`/mentor/projects/${encodeURIComponent(reviewId)}/guidance`, { guidance });
  }
  encouragementRecipients(): Observable<readonly MentorRecipient[]> {
    return this.api.getData('/mentor/encouragement/recipients');
  }
  encourage(participantId: string, message: string): Observable<void> {
    return this.api.postData('/mentor/encouragement', { participantId, message });
  }
}

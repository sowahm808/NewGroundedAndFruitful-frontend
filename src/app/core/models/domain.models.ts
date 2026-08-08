export type UserRole = 'child' | 'parent' | 'mentor' | 'observer' | 'admin' | 'super_admin';
export interface SessionUser {
  readonly uid: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
  readonly disabled: boolean;
}
export type LoadState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'error'; message: string; kind: 'validation' | 'authorization' | 'network' | 'unexpected' };
export interface CharacterQuality {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}
export interface CharacterRating {
  readonly qualityId: string;
  readonly rating: number | null;
}
export type BibleActivityType = 'multiple_choice' | 'true_false' | 'scripture_reading' | 'reflection' | 'memory_verse';
export interface BibleActivity {
  readonly id: string;
  readonly title: string;
  readonly type: BibleActivityType;
  readonly prompt: string;
  readonly participationPoints?: number;
}
export interface TeamProgress {
  readonly individualContribution: number;
  readonly quarterPoints: number;
  readonly target: number;
  readonly programWeek: number;
}
export interface DailyJourney {
  readonly childName: string;
  readonly programWeek: number;
  readonly completedActivityIds: readonly string[];
  readonly individualPoints: number;
  readonly team: TeamProgress;
  readonly readingStatus: string;
  readonly projectStatus: string;
}
export type AcademicSupportStatus = 'requested' | 'assigned' | 'active' | 'completed' | 'cancelled';
export type ReflectionMediaType = 'text' | 'audio' | 'video';
export interface ReadingReflection {
  readonly id: string;
  readonly week: number;
  readonly responseType: ReflectionMediaType;
  readonly response: string;
  readonly submittedAt: string;
}
export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

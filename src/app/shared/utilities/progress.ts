import { CharacterRating, TeamProgress } from '../../core/models/domain.models';

export function percent(current: number, target: number): number {
  return target <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}
export function completedRatings(ratings: readonly CharacterRating[]): number {
  return ratings.filter(({ rating }) => rating !== null).length;
}
export function assessmentComplete(ratings: readonly CharacterRating[], expected = 5): boolean {
  return ratings.length === expected && completedRatings(ratings) === expected;
}
export function teamProgress(progress: TeamProgress): number {
  return percent(progress.quarterPoints, progress.target);
}
/** Participation is acknowledged equally; correctness and rating values are never inputs. */
export function participationCompletionPoints(configuredPoints: number, completed: boolean): number {
  return completed ? Math.max(0, configuredPoints) : 0;
}

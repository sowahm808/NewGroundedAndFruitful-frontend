import { ApiError } from '../../core/http/api-error';
export interface MentorViewError {
  readonly message: string;
  readonly requestId?: string;
}
export function mentorViewError(error: unknown): MentorViewError {
  if (error instanceof ApiError) return { message: error.message, requestId: error.requestId };
  return { message: 'We could not load this mentor view. Please try again.' };
}

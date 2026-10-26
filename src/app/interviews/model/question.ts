export type QuestionOrigin = 'AI_SUGGESTED' | 'MANUAL';

/** Respuesta de GET /job-postings/{jobPostingId}/questions (una por elemento, ordenadas por position). */
export interface Question {
  id: number;
  jobPostingId: number;
  criterionId: number;
  statement: string;
  maxDurationSeconds: number;
  position: number;
  origin: QuestionOrigin;
  allowsFollowUp: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de POST /interview-sessions/{sessionId}/answers. */
export interface RecordAnswerRequest {
  questionId: number;
  transcript: string;
  durationSeconds: number;
  followUp: boolean;
  parentAnswerId?: number | null;
}

export type InterviewSessionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';

/** Respuesta de /applications/{applicationId}/interview-session. */
export interface InterviewSession {
  id: number;
  applicationId: number;
  jobPostingId: number;
  candidateId: number;
  status: InterviewSessionStatus;
  invitedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Último día para iniciar la entrevista, en formato yyyy-MM-dd. */
  expiresAt: string;
  totalDurationSeconds: number;
  answeredQuestions: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewSessionRequest {
  /** yyyy-MM-dd */
  expiresAt: string;
}

/** Datos que recibe el diálogo de invitación. */
export interface InviteInterviewDialogData {
  applicationId: number;
}

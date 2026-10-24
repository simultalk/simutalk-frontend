// Basado en Figura 28 y Tabla 11/13 del informe TB1
export interface EvaluationCriterion {
  id: number;
  jobPostingId: number;
  name: string;
  description: string;
  weight: number;
  criterionType: 'COMPETENCY' | 'CERTIFICATION';
  certificationName?: string | null;
  mandatory: boolean;
  origin: 'MANUAL' | 'AI_SUGGESTED';
}

export interface JobPosting {
  id: number;
  title: string;
  description: string;
  companyId: number;
  companyName?: string; // Opcional si el backend lo enriquece
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  closingDate: string;
  anonymizedScreening: boolean;
  totalWeight: number;
  criteria?: EvaluationCriterion[];
}

// Etapas del pipeline según US-17 y sección 6.3
export type ApplicationStatus =
  | 'RECEIVED'
  | 'INTERVIEWING'
  | 'ASSESSED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'HIRED';

// Basado en Figura 32 y 33 del informe TB1
export interface Application {
  id: number;
  jobPostingId: number;
  jobPostingTitle?: string;
  companyName?: string;
  candidateId: number;
  candidateName?: string;
  status: ApplicationStatus;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Basado en Figura 34 del informe TB1 (US-22)
export interface InterviewSession {
  id: number;
  applicationId: number;
  jobPostingId: number;
  candidateId: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  invitedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  expiresAt: string;
  totalDurationSeconds: number;
  answeredQuestions: number;
}

// Basado en Figura 37 y Diagrama de BD (Figura 18) para US-22
export interface CriterionScore {
  id: number;
  criterionId: number;
  criterionName: string;
  criterionKind: 'COMPETENCY' | 'CERTIFICATION';
  score: number;
  weightApplied: number;
  confidence: number;
  evidenceCount: number;
}

export interface Assessment {
  id: number;
  interviewSessionId: number;
  applicationId: number;
  jobPostingId: number;
  weightedScore: number;
  engineVersion: string;
  computedAt: string;
  feedbackSummary?: string;
  criterionScores: CriterionScore[];
}
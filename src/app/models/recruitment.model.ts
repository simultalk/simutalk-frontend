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
  companyName?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  closingDate: string;
  anonymizedScreening: boolean;
  totalWeight: number;
  criteria?: EvaluationCriterion[];
}

export type ApplicationStatus =
  | 'RECEIVED'
  | 'INTERVIEWING'
  | 'ASSESSED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'HIRED';

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

export interface CreateJobPostingRequest {
  title: string;
  description: string;
  closingDate: string;
  anonymizedScreening: boolean;
}
// Datos que se envían para crear o editar un criterio (US-02, US-03)
export interface CriterionRequest {
  name: string;
  description: string;
  weight: number;
  criterionType: 'COMPETENCY' | 'CERTIFICATION';
  certificationName: string | null;
  mandatory: boolean;
  origin?: CriterionOrigin;
}
// Datos que se envían para crear una pregunta del guion (US-05)
export interface QuestionRequest {
  criterionId: number;
  statement: string;
  maxDurationSeconds: number;
  allowsFollowUp: boolean;
  origin?: 'MANUAL' | 'AI_SUGGESTED';
}

// Origen de un criterio: lo escribió el reclutador o vino de una sugerencia (US-04)
export type CriterionOrigin = 'MANUAL' | 'AI_SUGGESTED';

// Criterio propuesto por la IA: sin peso y sin guardar (US-04)
export interface CriterionSuggestion {
  name: string;
  description: string;
  criterionType: 'COMPETENCY' | 'CERTIFICATION';
  rationale: string;
}

// Pregunta propuesta por la IA para un criterio, sin guardar (US-04)
export interface QuestionSuggestion {
  criterionId: number;
  statement: string;
  rationale: string;
}

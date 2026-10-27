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

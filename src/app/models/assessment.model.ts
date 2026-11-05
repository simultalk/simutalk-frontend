export type IntegritySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type IntegrityFlagType = 'AI_GENERATED_CONTENT' | 'CV_INCONSISTENCY';

export interface IntegrityFlag {
  flagType: IntegrityFlagType;
  severity: IntegritySeverity;
  detail?: string;
}

export interface CriterionScore {
  id: number;              // criterionScoreId
  criterionId?: number;
  criterionName: string;
  weightApplied: number;   // peso aplicado
  score: number;           // puntaje del criterio
}

export interface Assessment {
  id: number;              // assessmentId
  interviewSessionId?: number;
  weightedScore: number;
  feedbackSummary?: string;
  criterionScores: CriterionScore[];
  integrityFlags: IntegrityFlag[];
}

export interface Evidence {
  id?: number;
  answerId: number;
  startOffset: number;
  endOffset: number;       // se asume exclusivo
}

export interface InterviewAnswer {
  id: number;
  questionId?: number;
  transcript: string;
  durationSeconds?: number;
  followUp: boolean;
  parentAnswerId?: number | null;
}
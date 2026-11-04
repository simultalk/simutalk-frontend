export type RankingBadge =
  | 'TOP_RANKED'
  | 'STRONG_EVIDENCE'
  | 'VERIFIED_CERTIFICATIONS'
  | 'MISSING_MANDATORY_CERTIFICATION'
  | 'INTEGRITY_ALERT';

export interface CriterionBreakdown {
  criterionId: number;
  criterionName: string;
  appliedWeight: number;   // peso aplicado
  score: number;           // puntaje del criterio
  evidenceCount: number;   // cantidad de evidencias
}

export interface RankingEntry {
  position: number;
  candidateName?: string;
  candidateCode?: string;  // lo usará US-13 (modo anónimo)
  applicationId: number;
  interviewSessionId: number;
  weightedScore: number;
  criteria: CriterionBreakdown[];
  badges: RankingBadge[];
}

export interface RankingResponse {
  anonymizationForced?: boolean;
  entries: RankingEntry[];
}

export interface JobPostingSummary {
  id: number;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}
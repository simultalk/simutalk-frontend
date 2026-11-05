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
  assessmentId: number;
  weightedScore: number;
  criteria: CriterionBreakdown[];
  badges: RankingBadge[];
}

export interface RankingResponse {
  anonymized: boolean;
  anonymizationForced?: boolean;
  entries: RankingEntry[];
}

/** Lo que responde de verdad GET /job-postings/{id}/ranking; el servicio lo pasa a RankingResponse. */
export interface RankingApiResponse {
  jobPostingId: number;
  anonymized: boolean;
  anonymizationForced: boolean;
  candidates: {
    rank: number;
    candidateCode: string;
    fullName: string | null;
    applicationId: number;
    assessmentId: number;
    weightedScore: number;
    criteria: {
      criterionId: number;
      criterionName: string;
      weightApplied: number;
      score: number;
      evidenceCount: number;
    }[];
    badges: RankingBadge[];
  }[];
}

export interface JobPostingSummary {
  id: number;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}
/** Las seis etapas del pipeline, en el orden del embudo. */
export const FUNNEL_STAGES = [
  'RECEIVED',
  'INTERVIEWING',
  'ASSESSED',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
] as const;

export type FunnelStageCode = (typeof FUNNEL_STAGES)[number];

/** GET /reports/job-postings/{id}/funnel  (⚠ verifica la forma en Swagger) */
export interface FunnelResponse {
  jobPostingId: number;
  stages: { stage: string; count: number }[];
}

/** GET /reports/job-postings/{id}/criterion-averages  (⚠ verifica la forma en Swagger) */
export interface CriterionAveragesResponse {
  jobPostingId: number;
  criteria: { criterionId: number; criterionName: string; averageScore: number }[];
}

/** Modelos de vista: lo que consume el componente. */
export interface FunnelStageCount {
  stage: FunnelStageCode;
  count: number;
}

export interface CriterionAverage {
  criterionId: number;
  criterionName: string;
  averageScore: number;
}
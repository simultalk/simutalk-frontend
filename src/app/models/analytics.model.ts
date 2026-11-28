// Bounded context analytics (US-21)

/** Traslados a entrevistas presenciales que no se hicieron gracias a la entrevista asincrónica. */
export interface CarbonSavingsReport {
  jobPostingId: number;
  totalKgCo2eAvoided: number;
  tripsAvoided: number;
  totalKmAvoided: number;
}

/** GET /reports/companies/{id}/summary: indicadores generales de la empresa. */
export interface CompanySummaryReport {
  companyId: number;
  activeJobPostings: number;
  assessedCandidates: number;
  /** null mientras ninguna postulación haya llegado a preseleccionada. */
  averageDaysToShortlist: number | null;
  anchoredEvidences: number;
}

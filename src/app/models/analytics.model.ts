// Bounded context analytics (US-21)

/** Traslados a entrevistas presenciales que no se hicieron gracias a la entrevista asincrónica. */
export interface CarbonSavingsReport {
  jobPostingId: number;
  totalKgCo2eAvoided: number;
  tripsAvoided: number;
  totalKmAvoided: number;
}

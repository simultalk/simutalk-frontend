export type ApplicationStatus = 'RECEIVED' | 'INTERVIEWING' | 'ASSESSED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

export interface Application {
  id: number;
  jobPostingId: number;
  candidateId: number;
  status: ApplicationStatus;
  appliedAt: string;
}
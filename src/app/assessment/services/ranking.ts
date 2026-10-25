import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobPostingSummary, RankingResponse } from '../model/ranking';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Vacantes activas (PUBLISHED) del reclutador. */
  getActiveJobPostings(): Observable<JobPostingSummary[]> {
    return this.http
      .get<JobPostingSummary[]>(`${this.baseUrl}/job-postings`)
      .pipe(map((list) => list.filter((j) => j.status === 'PUBLISHED')));
  }

  getRanking(jobPostingId: number): Observable<RankingResponse> {
    return this.http.get<RankingResponse>(
      `${this.baseUrl}/job-postings/${jobPostingId}/ranking`
    );
  }
}
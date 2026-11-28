import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobPostingSummary, RankingApiResponse, RankingResponse } from '../models/ranking';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Vacantes publicadas o cerradas de la empresa del reclutador (los borradores no tienen postulantes). */
  getActiveJobPostings(): Observable<JobPostingSummary[]> {
    return this.http.get<{ id: number }>(`${this.baseUrl}/company-profiles/me`).pipe(
      switchMap((company) =>
        this.http.get<JobPostingSummary[]>(`${this.baseUrl}/job-postings`, {
          params: { companyId: company.id },
        }),
      ),
      map((list) => list.filter((j) => j.status !== 'DRAFT')),
    );
  }

  /** El backend responde "candidates" con "rank" y "fullName": aquí se pasa al modelo de la pantalla. */
  getRanking(jobPostingId: number, anonymized = false): Observable<RankingResponse> {
    const params = new HttpParams().set('anonymized', String(anonymized));
    return this.http
      .get<RankingApiResponse>(`${this.baseUrl}/job-postings/${jobPostingId}/ranking`, { params })
      .pipe(
        map((res) => ({
          anonymized: res.anonymized,
          anonymizationForced: res.anonymizationForced,
          entries: res.candidates.map((c) => ({
            position: c.rank,
            candidateName: c.fullName ?? undefined,
            candidateCode: c.candidateCode,
            applicationId: c.applicationId,
            assessmentId: c.assessmentId,
            weightedScore: c.weightedScore,
            badges: c.badges,
            criteria: c.criteria.map((k) => ({
              criterionId: k.criterionId,
              criterionName: k.criterionName,
              appliedWeight: k.weightApplied,
              score: k.score,
              evidenceCount: k.evidenceCount,
            })),
          })),
        })),
      );
  }
}
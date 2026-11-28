import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CriterionAverage,
  CriterionAveragesResponse,
  FUNNEL_STAGES,
  FunnelResponse,
  FunnelStageCount,
} from '../model/job-posting-report';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports/job-postings`;

  /** Siempre devuelve las seis etapas, en orden; las que el API no trae quedan en 0. */
  getFunnel(jobPostingId: number): Observable<FunnelStageCount[]> {
    return this.http.get<FunnelResponse>(`${this.baseUrl}/${jobPostingId}/funnel`).pipe(
      map((res) =>
        FUNNEL_STAGES.map((stage) => ({
          stage,
          count: res.stages?.find((s) => s.stage === stage)?.count ?? 0,
        })),
      ),
    );
  }

  getCriterionAverages(jobPostingId: number): Observable<CriterionAverage[]> {
    return this.http
      .get<CriterionAveragesResponse>(`${this.baseUrl}/${jobPostingId}/criterion-averages`)
      .pipe(map((res) => res.criteria ?? []));
  }
}
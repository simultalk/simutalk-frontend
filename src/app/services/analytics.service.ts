import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarbonSavingsReport } from '../models/analytics.model';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // GET /reports/job-postings/{id}/carbon-savings (US-21)
  getCarbonSavings(jobPostingId: number): Observable<CarbonSavingsReport> {
    return this.http.get<CarbonSavingsReport>(`${this.apiUrl}/reports/job-postings/${jobPostingId}/carbon-savings`);
  }
}

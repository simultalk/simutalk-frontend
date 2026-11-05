import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Assessment, Evidence, InterviewAnswer } from '../models/assessment.model';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAssessment(sessionId: number): Observable<Assessment> {
    return this.http.get<Assessment>(
      `${this.baseUrl}/interview-sessions/${sessionId}/assessment`
    );
  }

  calculateAssessment(sessionId: number): Observable<Assessment> {
    return this.http.post<Assessment>(
      `${this.baseUrl}/interview-sessions/${sessionId}/assessment`,
      {}
    );
  }

  getEvidences(assessmentId: number, criterionScoreId: number): Observable<Evidence[]> {
    return this.http.get<Evidence[]>(
      `${this.baseUrl}/assessments/${assessmentId}/criterion-scores/${criterionScoreId}/evidences`
    );
  }

  getAnswers(sessionId: number): Observable<InterviewAnswer[]> {
    return this.http.get<InterviewAnswer[]>(
      `${this.baseUrl}/interview-sessions/${sessionId}/answers`
    );
  }
}
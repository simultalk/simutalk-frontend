import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Assessment,
  Evidence,
  IntegrityFlag,
  IntegritySeverity,
  InterviewAnswer,
} from '../models/assessment.model';

const SEVERITY_ORDER: Record<IntegritySeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Ordena de mayor a menor severidad. Si el campo no viene (p. ej. vista de postulante), devuelve undefined. */
export function sortIntegrityFlags(flags?: IntegrityFlag[] | null): IntegrityFlag[] | undefined {
  if (!Array.isArray(flags)) return undefined;
  return [...flags].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

const withSortedFlags = (a: Assessment): Assessment => ({
  ...a,
  integrityFlags: sortIntegrityFlags(a.integrityFlags),
});

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAssessment(sessionId: number): Observable<Assessment> {
    return this.http
      .get<Assessment>(`${this.baseUrl}/interview-sessions/${sessionId}/assessment`)
      .pipe(map(withSortedFlags));
  }

  calculateAssessment(sessionId: number): Observable<Assessment> {
    return this.http
      .post<Assessment>(`${this.baseUrl}/interview-sessions/${sessionId}/assessment`, {})
      .pipe(map(withSortedFlags));
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
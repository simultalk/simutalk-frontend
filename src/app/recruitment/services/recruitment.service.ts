import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  JobPosting,
  Application,
  ApplicationStatus,
  InterviewSession,
  Assessment
} from '../model/recruitment.model';

@Injectable({
  providedIn: 'root'
})
export class RecruitmentService {
  // Usa la URL desplegada en AWS o localhost según tu environment.ts
  private apiUrl = 'http://77.112.147.229:8080/api/v1';

  constructor(private http: HttpClient) {}

  // 1. Vacantes visibles para el postulante (Sprint 3)
  // GET /job-postings?status=PUBLISHED
  getPublishedJobPostings(): Observable<JobPosting[]> {
    const params = new HttpParams().set('status', 'PUBLISHED');
    return this.http.get<JobPosting[]>(`${this.apiUrl}/job-postings`, { params });
  }

  // 2. Detalle de la vacante (Sprint 3 - US-06)
  // GET /job-postings/{id}
  getJobPostingById(id: number): Observable<JobPosting> {
    return this.http.get<JobPosting>(`${this.apiUrl}/job-postings/${id}`);
  }

  // 3. Postular a una vacante (Sprint 3 - US-06)
  // POST /job-postings/{id}/applications
  applyToJobPosting(jobPostingId: number): Observable<Application> {
    return this.http.post<Application>(
      `${this.apiUrl}/job-postings/${jobPostingId}/applications`,
      {}
    );
  }

  // 4. Pipeline del reclutador por vacante y etapa (Sprint 4 - US-17)
  // GET /job-postings/{id}/applications?status=
  getApplicationsByJobPosting(jobPostingId: number, status?: ApplicationStatus): Observable<Application[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Application[]>(
      `${this.apiUrl}/job-postings/${jobPostingId}/applications`,
      { params }
    );
  }

  // 5. Avanzar de etapa a un postulante (Sprint 4 - US-18)
  // PATCH /applications/{id}/status
  updateApplicationStatus(applicationId: number, status: ApplicationStatus): Observable<Application> {
    return this.http.patch<Application>(
      `${this.apiUrl}/applications/${applicationId}/status`,
      { status }
    );
  }

  // 6. Mis postulaciones del candidato (Sprint 4 - US-23)
  // GET /applications
  getMyApplications(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/applications`);
  }

  // 7. Obtener la sesión de entrevista de una postulación (Sprint 4 - US-22)
  // GET /applications/{id}/interview-session
  getInterviewSessionByApplication(applicationId: number): Observable<InterviewSession> {
    return this.http.get<InterviewSession>(
      `${this.apiUrl}/applications/${applicationId}/interview-session`
    );
  }

  // 8. Obtener retroalimentación y puntaje por criterio (Sprint 4 - US-22)
  // GET /interview-sessions/{sessionId}/assessment
  getAssessmentBySession(sessionId: number): Observable<Assessment> {
    return this.http.get<Assessment>(
      `${this.apiUrl}/interview-sessions/${sessionId}/assessment`
    );
  }
}
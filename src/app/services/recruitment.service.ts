import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  JobPosting,
  Application,
  ApplicationStatus,
  InterviewSession,
  Assessment,
  CreateJobPostingRequest,
  CriterionRequest,
  EvaluationCriterion,
  QuestionRequest,
} from '../models/recruitment.model';
import { Question } from '../models/question';

@Injectable({
  providedIn: 'root',
})
export class RecruitmentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // 0. POST /job-postings (Sprint 3 - US-01)
  createJobPosting(request: CreateJobPostingRequest): Observable<JobPosting> {
    return this.http.post<JobPosting>(`${this.apiUrl}/job-postings`, request);
  }
  // GET /company-profiles/me + GET /job-postings?companyId= (US-01)
  getMyJobPostings(): Observable<JobPosting[]> {
    return this.http.get<{ id: number }>(`${this.apiUrl}/company-profiles/me`).pipe(
      switchMap((company) => {
        const params = new HttpParams().set('companyId', company.id);
        return this.http.get<JobPosting[]>(`${this.apiUrl}/job-postings`, { params });
      }),
    );
  }
  // PUT /job-postings/{id} (US-01)
  updateJobPosting(id: number, request: CreateJobPostingRequest): Observable<JobPosting> {
    return this.http.put<JobPosting>(`${this.apiUrl}/job-postings/${id}`, request);
  }

  // DELETE /job-postings/{id} (US-01)
  deleteJobPosting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/job-postings/${id}`);
  }
  // POST /job-postings/{id}/criteria (US-02)
  addCriterion(jobPostingId: number, request: CriterionRequest): Observable<EvaluationCriterion> {
    return this.http.post<EvaluationCriterion>(`${this.apiUrl}/job-postings/${jobPostingId}/criteria`, request);
  }

  // PUT /job-postings/{id}/criteria/{criterionId} (US-03)
  updateCriterion(jobPostingId: number, criterionId: number, request: CriterionRequest): Observable<EvaluationCriterion> {
    return this.http.put<EvaluationCriterion>(
      `${this.apiUrl}/job-postings/${jobPostingId}/criteria/${criterionId}`,
      request,
    );
  }

  // DELETE /job-postings/{id}/criteria/{criterionId} (US-03)
  deleteCriterion(jobPostingId: number, criterionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/job-postings/${jobPostingId}/criteria/${criterionId}`);
  }

  // GET /job-postings/{id}/questions (US-05)
  getQuestions(jobPostingId: number): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.apiUrl}/job-postings/${jobPostingId}/questions`);
  }

  // POST /job-postings/{id}/questions (US-05)
  addQuestion(jobPostingId: number, request: QuestionRequest): Observable<Question> {
    return this.http.post<Question>(`${this.apiUrl}/job-postings/${jobPostingId}/questions`, request);
  }

  // DELETE /job-postings/{id}/questions/{questionId} (US-05)
  deleteQuestion(jobPostingId: number, questionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/job-postings/${jobPostingId}/questions/${questionId}`);
  }

  // PATCH /job-postings/{id}/questions/order (US-05)
  reorderQuestions(jobPostingId: number, orderedIds: number[]): Observable<Question[]> {
    return this.http.patch<Question[]>(`${this.apiUrl}/job-postings/${jobPostingId}/questions/order`, { orderedIds });
  }

  // PATCH /job-postings/{id}/status (US-05): PUBLISHED o CLOSED
  changeJobPostingStatus(jobPostingId: number, status: 'PUBLISHED' | 'CLOSED'): Observable<JobPosting> {
    return this.http.patch<JobPosting>(`${this.apiUrl}/job-postings/${jobPostingId}/status`, { status });
  }
  // 1. GET /job-postings?status=PUBLISHED (Sprint 3)
  getPublishedJobPostings(): Observable<JobPosting[]> {
    const params = new HttpParams().set('status', 'PUBLISHED');
    return this.http.get<JobPosting[]>(`${this.apiUrl}/job-postings`, { params });
  }

  // 2. GET /job-postings/{id} (Sprint 3 - US-06)
  getJobPostingById(id: number): Observable<JobPosting> {
    return this.http.get<JobPosting>(`${this.apiUrl}/job-postings/${id}`);
  }

  // 3. POST /job-postings/{id}/applications (Sprint 3 - US-06)
  applyToJobPosting(jobPostingId: number): Observable<Application> {
    return this.http.post<Application>(
      `${this.apiUrl}/job-postings/${jobPostingId}/applications`,
      {},
    );
  }

  // 4. GET /job-postings/{id}/applications?status= (Sprint 4 - US-17)
  getApplicationsByJobPosting(
    jobPostingId: number,
    status?: ApplicationStatus,
  ): Observable<Application[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Application[]>(
      `${this.apiUrl}/job-postings/${jobPostingId}/applications`,
      { params },
    );
  }

  // 5. PATCH /applications/{id}/status (Sprint 4 - US-18)
  updateApplicationStatus(
    applicationId: number,
    status: ApplicationStatus,
  ): Observable<Application> {
    return this.http.patch<Application>(`${this.apiUrl}/applications/${applicationId}/status`, {
      status,
    });
  }

  // 6. GET /applications (Sprint 4 - US-23)
  getMyApplications(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/applications`);
  }

  // 7. GET /applications/{id}/interview-session (Sprint 4 - US-22)
  getInterviewSessionByApplication(applicationId: number): Observable<InterviewSession> {
    return this.http.get<InterviewSession>(
      `${this.apiUrl}/applications/${applicationId}/interview-session`,
    );
  }

  // 8. GET /interview-sessions/{sessionId}/assessment (Sprint 4 - US-22)
  getAssessmentBySession(sessionId: number): Observable<Assessment> {
    return this.http.get<Assessment>(`${this.apiUrl}/interview-sessions/${sessionId}/assessment`);
  }
}

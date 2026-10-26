import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateInterviewSessionRequest, InterviewSession } from '../models/interview-session';

@Injectable({ providedIn: 'root' })
export class InterviewSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** US-07: invita al postulante. La postulación debe estar en RECEIVED y pasa a INTERVIEWING. */
  invite(applicationId: number, expiresAt: string): Observable<InterviewSession> {
    const body: CreateInterviewSessionRequest = { expiresAt };
    return this.http.post<InterviewSession>(
      `${this.baseUrl}/applications/${applicationId}/interview-session`,
      body,
    );
  }

  getByApplication(applicationId: number): Observable<InterviewSession> {
    return this.http.get<InterviewSession>(
      `${this.baseUrl}/applications/${applicationId}/interview-session`,
    );
  }
}

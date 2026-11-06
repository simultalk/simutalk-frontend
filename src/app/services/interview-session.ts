import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateInterviewSessionRequest, InterviewSession } from '../models/interview-session';
import { Answer, FollowUpQuestion, Question, RecordAnswerRequest } from '../models/question';

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

  /** US-08: el postulante empieza su entrevista. Solo desde PENDING y antes de la fecha límite. */
  start(sessionId: number): Observable<InterviewSession> {
    return this.http.post<InterviewSession>(`${this.baseUrl}/interview-sessions/${sessionId}/start`, {});
  }

  /** Guion de la vacante. El postulante solo puede leerlo con su entrevista IN_PROGRESS. */
  getQuestions(jobPostingId: number): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.baseUrl}/job-postings/${jobPostingId}/questions`);
  }

  /** US-08: registra una respuesta. Devuelve su id, que la repregunta (US-09) usa como parentAnswerId. */
  recordAnswer(sessionId: number, request: RecordAnswerRequest): Observable<Answer> {
    return this.http.post<Answer>(`${this.baseUrl}/interview-sessions/${sessionId}/answers`, request);
  }

  /** US-10: el postulante termina y envía su entrevista. Pide que todas las preguntas estén respondidas. */
  complete(sessionId: number): Observable<InterviewSession> {
    return this.http.post<InterviewSession>(`${this.baseUrl}/interview-sessions/${sessionId}/completion`, {});
  }

  /** US-09: pide a la IA una repregunta sobre una respuesta. Si ya existe, el backend devuelve la misma. */
  generateFollowUp(sessionId: number, answerId: number): Observable<FollowUpQuestion> {
    return this.http.post<FollowUpQuestion>(
      `${this.baseUrl}/interview-sessions/${sessionId}/answers/${answerId}/follow-up`,
      {},
    );
  }

  /** Respuestas ya registradas: permiten retomar la entrevista donde quedó. */
  getAnswers(sessionId: number): Observable<Answer[]> {
    return this.http.get<Answer[]>(`${this.baseUrl}/interview-sessions/${sessionId}/answers`);
  }
}

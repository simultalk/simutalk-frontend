import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { InterviewSessionService } from './interview-session';

describe('InterviewSessionService', () => {
  let service: InterviewSessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InterviewSessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('invita con POST y la fecha límite en el cuerpo', () => {
    service.invite(5, '2026-11-15').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/applications/5/interview-session`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ expiresAt: '2026-11-15' });
    request.flush({ id: 1, applicationId: 5, status: 'PENDING' });
  });

  it('empieza la entrevista con POST /start', () => {
    service.start(900).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/interview-sessions/900/start`);
    expect(request.request.method).toBe('POST');
    request.flush({ id: 900, status: 'IN_PROGRESS' });
  });

  it('lee el guion de la vacante', () => {
    service.getQuestions(10).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/job-postings/10/questions`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('registra una respuesta con el cuerpo que espera el backend', () => {
    const body = { questionId: 2, transcript: 'Mi respuesta', durationSeconds: 95, followUp: false };
    service.recordAnswer(900, body).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/interview-sessions/900/answers`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 102, questionId: 2 });
  });

  it('lee las respuestas registradas', () => {
    service.getAnswers(900).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/interview-sessions/900/answers`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('obtiene la sesión de una postulación con GET', () => {
    service.getByApplication(5).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/applications/5/interview-session`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 1 });
  });
});

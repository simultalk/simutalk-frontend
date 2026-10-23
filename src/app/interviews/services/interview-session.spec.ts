import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
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

  it('obtiene la sesión de una postulación con GET', () => {
    service.getByApplication(5).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/applications/5/interview-session`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 1 });
  });
});

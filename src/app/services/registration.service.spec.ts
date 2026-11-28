import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { ApplicantRegistrationError, RegistrationService } from './registration.service';
import { authInterceptor } from '../interceptors/auth.interceptor';

describe('Registro de candidato', () => {
  let service: RegistrationService;
  let http: HttpTestingController;
  const base = environment.apiUrl;
  const data = {
    firstName: 'Ana', lastName: 'Torres', email: 'ana@example.com', phone: '987654321',
    documentNumber: '12345678', birthDate: '2000-05-10', district: 'Lima',
    yearsOfExperience: 0, password: 'UnaClave123',
  };

  beforeEach(() => {
    localStorage.removeItem('simutalk.session');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(RegistrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('simutalk.session');
  });

  function login() {
    const signIn = http.expectOne(`${base}/authentication/sign-in`);
    expect(signIn.request.body).toEqual({ username: data.email, password: data.password });
    signIn.flush({ id: 12, username: data.email, token: 'candidate-token' });
    http.expectOne(`${base}/users/12`).flush({ id: 12, username: data.email, roles: ['ROLE_CANDIDATE'] });
    http.expectOne(`${base}/candidate-profiles/me`).flush({}, { status: 404, statusText: 'Not Found' });
  }

  it('crea cuenta, inicia sesión y guarda el perfil con el token del candidato', () => {
    let saved = false;
    service.registerApplicant(data).subscribe(() => saved = true);
    const signUp = http.expectOne(`${base}/authentication/sign-up`);
    expect(signUp.request.body).toEqual({ username: data.email, password: data.password, roles: ['ROLE_CANDIDATE'] });
    signUp.flush({ id: 12, username: data.email });
    login();
    const profile = http.expectOne(`${base}/candidate-profiles`);
    expect(profile.request.method).toBe('POST');
    expect(profile.request.headers.get('Authorization')).toBe('Bearer candidate-token');
    const { password, ...expected } = data;
    expect(profile.request.body).toEqual({ ...expected, userId: 12 });
    expect(saved).toBe(false);
    profile.flush({ id: 5, userId: 12 });
    expect(saved).toBe(true);
  });

  it('permite reintentar el perfil sin volver a crear la cuenta', () => {
    let failure: ApplicantRegistrationError | undefined;
    service.registerApplicant(data, true).subscribe({ error: error => failure = error });
    http.expectNone(`${base}/authentication/sign-up`);
    login();
    http.expectOne(`${base}/candidate-profiles`).flush({ message: 'Documento duplicado' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(failure?.accountCreated).toBe(true);
  });

  it('no inicia sesión ni guarda perfil si falla la creación de cuenta', () => {
    let failure: ApplicantRegistrationError | undefined;
    service.registerApplicant(data).subscribe({ error: error => failure = error });
    http.expectOne(`${base}/authentication/sign-up`).flush({}, { status: 422, statusText: 'Unprocessable Entity' });
    http.expectNone(`${base}/authentication/sign-in`);
    http.expectNone(`${base}/candidate-profiles`);
    expect(failure?.accountCreated).toBe(false);
  });
});

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  AccountResponse,
  ApplicantRegisterRequest,
  CompanyRegisterRequest,
  CandidateProfileResponse,
  CompanyProfileResponse,
} from '../models/registration.model';

export class ApplicantRegistrationError {
  constructor(public cause: unknown, public accountCreated: boolean) {}
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // US-25: Registro de empresa. 1) crea la cuenta con rol reclutador, 2) inicia sesión,
  // 3) crea el perfil de empresa con el id del usuario. El correo es el usuario.
  registerCompany(request: CompanyRegisterRequest): Observable<CompanyProfileResponse> {
    const credentials = { username: request.email.trim(), password: request.password };
    const { password, ...profile } = request;

    return this.http
      .post<AccountResponse>(`${this.apiUrl}/authentication/sign-up`, {
        ...credentials,
        roles: ['ROLE_RECRUITER'],
      })
      .pipe(
        switchMap(() => this.auth.signIn(credentials)),
        switchMap((session) =>
          this.http.post<CompanyProfileResponse>(`${this.apiUrl}/company-profiles`, {
            ...profile,
            email: credentials.username,
            legalName: request.legalName.trim(),
            tradeName: request.tradeName.trim(),
            industry: request.industry.trim(),
            district: request.district.trim(),
            userId: session.id,
          }),
        ),
      );
  }

  // US-26: Registro de postulante
  registerApplicant(request: ApplicantRegisterRequest, completeExistingAccount = false): Observable<CandidateProfileResponse> {
    const credentials = { username: request.email.trim(), password: request.password };
    let accountCreated = completeExistingAccount;
    const account: Observable<AccountResponse | null> = completeExistingAccount
      ? of(null)
      : this.http.post<AccountResponse>(`${this.apiUrl}/authentication/sign-up`, {
          ...credentials, roles: ['ROLE_CANDIDATE'],
        });

    return account.pipe(
      switchMap(() => {
        accountCreated = true;
        return this.auth.signIn(credentials);
      }),
      switchMap(session => {
        if (!session.roles.includes('ROLE_CANDIDATE')) {
          return throwError(() => new Error('La cuenta debe tener el rol de postulante.'));
        }
        return this.http.get<CandidateProfileResponse>(`${this.apiUrl}/candidate-profiles/me`).pipe(
          catchError(error => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
              return throwError(() => error);
            }
            const { password, ...profile } = request;
            return this.http.post<CandidateProfileResponse>(`${this.apiUrl}/candidate-profiles`, {
              ...profile,
              email: credentials.username,
              firstName: request.firstName.trim(),
              lastName: request.lastName.trim(),
              district: request.district.trim(),
              userId: session.id,
            });
          }),
        );
      }),
      catchError(error => throwError(() => new ApplicantRegistrationError(error, accountCreated))),
    );
  }
}

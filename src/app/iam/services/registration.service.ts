import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountResponse,
  ApplicantRegisterRequest,
  CompanyRegisterRequest,
} from '../model/registration.model';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // US: Registro de empresa
  registerCompany(request: CompanyRegisterRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.apiUrl}/companies/sign-up`, request);
  }

  // US-26: Registro de postulante
  registerApplicant(request: ApplicantRegisterRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.apiUrl}/applicants/sign-up`, request);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CandidateProfile,
  Certification,
  CompanyProfile,
  CertificationRequest,
  CertificationVerification,
  UpdateCandidateProfileRequest,
  UpdateCompanyProfileRequest,
} from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // GET /candidate-profiles/me: id del postulante con sesión
  getMyCandidateId(): Observable<number> {
    return this.http.get<{ id: number }>(`${this.apiUrl}/candidate-profiles/me`).pipe(map((p) => p.id));
  }

  // GET /candidate-profiles/me: perfil completo del postulante con sesión
  getMyProfile(): Observable<CandidateProfile> {
    return this.http.get<CandidateProfile>(`${this.apiUrl}/candidate-profiles/me`);
  }

  // PUT /candidate-profiles/{id}: actualiza los datos del postulante (el documento no cambia)
  updateMyProfile(candidateId: number, request: UpdateCandidateProfileRequest): Observable<CandidateProfile> {
    return this.http.put<CandidateProfile>(`${this.apiUrl}/candidate-profiles/${candidateId}`, request);
  }

  // GET /company-profiles/me: perfil de la empresa del reclutador con sesión
  getMyCompany(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.apiUrl}/company-profiles/me`);
  }

  // PUT /company-profiles/{id}: actualiza los datos de la empresa (el RUC no cambia)
  updateMyCompany(companyId: number, request: UpdateCompanyProfileRequest): Observable<CompanyProfile> {
    return this.http.put<CompanyProfile>(`${this.apiUrl}/company-profiles/${companyId}`, request);
  }

  // GET /candidate-profiles/{id}/certifications (US-15)
  getCertifications(candidateId: number): Observable<Certification[]> {
    return this.http.get<Certification[]>(`${this.apiUrl}/candidate-profiles/${candidateId}/certifications`);
  }

  // POST /candidate-profiles/{id}/certifications (US-15): siempre nace UNVERIFIED
  addCertification(candidateId: number, request: CertificationRequest): Observable<Certification> {
    return this.http.post<Certification>(`${this.apiUrl}/candidate-profiles/${candidateId}/certifications`, request);
  }

  // DELETE /candidate-profiles/{id}/certifications/{certificationId} (US-15)
  deleteCertification(candidateId: number, certificationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/candidate-profiles/${candidateId}/certifications/${certificationId}`,
    );
  }

  // POST /candidate-profiles/{id}/certifications/{certificationId}/verification (US-16)
  verifyCertification(candidateId: number, certificationId: number): Observable<CertificationVerification> {
    return this.http.post<CertificationVerification>(
      `${this.apiUrl}/candidate-profiles/${candidateId}/certifications/${certificationId}/verification`,
      {},
    );
  }
}

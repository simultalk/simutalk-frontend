import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Certification, CertificationRequest } from '../models/profile.model';

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
}

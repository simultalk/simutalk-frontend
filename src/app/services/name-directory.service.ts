import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Resuelve nombres que el backend no incluye en las vacantes y postulaciones:
 * - Empresa: GET /company-profiles/{id} → nombre comercial (cualquier usuario con sesión).
 * - Postulante: GET /candidate-profiles/{id} → nombres y apellidos (solo reclutador o admin).
 * Cada id se pide una sola vez y queda en caché mientras dure la sesión.
 * Si el backend ya manda el nombre, se respeta y no se pide nada.
 */
@Injectable({ providedIn: 'root' })
export class NameDirectoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private companies = new Map<number, Observable<string | null>>();
  private candidates = new Map<number, Observable<string | null>>();

  companyName(id: number): Observable<string | null> {
    if (!this.companies.has(id)) {
      this.companies.set(
        id,
        this.http.get<{ tradeName: string }>(`${this.apiUrl}/company-profiles/${id}`).pipe(
          map((c) => c.tradeName || null),
          catchError(() => of(null)),
          shareReplay(1),
        ),
      );
    }
    return this.companies.get(id)!;
  }

  candidateName(id: number): Observable<string | null> {
    if (!this.candidates.has(id)) {
      this.candidates.set(
        id,
        this.http.get<{ firstName: string; lastName: string }>(`${this.apiUrl}/candidate-profiles/${id}`).pipe(
          map((c) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || null),
          catchError(() => of(null)),
          shareReplay(1),
        ),
      );
    }
    return this.candidates.get(id)!;
  }

  /** Completa companyName en una lista (vacantes o postulaciones). */
  withCompanyNames<T extends { companyId?: number; companyName?: string }>(items: T[]): Observable<T[]> {
    const ids = [...new Set(items.filter((i) => !i.companyName && i.companyId).map((i) => i.companyId!))];
    if (ids.length === 0) return of(items);
    return forkJoin(ids.map((id) => this.companyName(id).pipe(map((name) => [id, name] as const)))).pipe(
      map((pairs) => {
        const names = new Map(pairs);
        return items.map((i) =>
          !i.companyName && i.companyId && names.get(i.companyId) ? { ...i, companyName: names.get(i.companyId)! } : i,
        );
      }),
    );
  }

  /** Completa candidateName en postulaciones. Con cribado anonimizado no se pide nada. */
  withCandidateNames<T extends { candidateId: number; candidateName?: string }>(
    items: T[],
    anonymized: boolean,
  ): Observable<T[]> {
    if (anonymized) return of(items);
    const ids = [...new Set(items.filter((i) => !i.candidateName).map((i) => i.candidateId))];
    if (ids.length === 0) return of(items);
    return forkJoin(ids.map((id) => this.candidateName(id).pipe(map((name) => [id, name] as const)))).pipe(
      map((pairs) => {
        const names = new Map(pairs);
        return items.map((i) =>
          !i.candidateName && names.get(i.candidateId) ? { ...i, candidateName: names.get(i.candidateId)! } : i,
        );
      }),
    );
  }

  /** Al cerrar sesión se limpia la caché. */
  clear(): void {
    this.companies.clear();
    this.candidates.clear();
  }
}

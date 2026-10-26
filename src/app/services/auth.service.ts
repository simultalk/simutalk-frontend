import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Session, SignInRequest, SignInResponse, UserResponse } from '../models/auth.model';
import { HOME_BY_ROLE, MENU_BY_ROLE, MenuItem, ROLE_LABELS } from '../models/menu';

const SESSION_KEY = 'simutalk.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  signIn(request: SignInRequest): Observable<Session> {
    return this.http.post<SignInResponse>(`${this.apiUrl}/authentication/sign-in`, request).pipe(
      switchMap(response =>
        this.http
          .get<UserResponse>(`${this.apiUrl}/users/${response.id}`, {
            headers: { Authorization: `Bearer ${response.token}` }
          })
          .pipe(
            map(user => ({
              id: response.id,
              username: response.username,
              token: response.token,
              roles: user.roles
            }))
          )
      ),
      tap(session => localStorage.setItem(SESSION_KEY, JSON.stringify(session)))
    );
  }

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/login']);
  }

  session(): Session | null {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) {
      return null;
    }
    try {
      return JSON.parse(saved) as Session;
    } catch {
      return null;
    }
  }

  token(): string | null {
    return this.session()?.token ?? null;
  }

  userId(): number | null {
    return this.session()?.id ?? null;
  }

  username(): string | null {
    return this.session()?.username ?? null;
  }

  roles(): string[] {
    return this.session()?.roles ?? [];
  }

  isLoggedIn(): boolean {
    return this.token() !== null;
  }

  hasAnyRole(roles: string[]): boolean {
    return this.roles().some(role => roles.includes(role));
  }

  /** Página de inicio según el rol (reclutador: Mis vacantes, postulante: Vacantes). */
  homeUrl(): string {
    const role = this.roles().find(r => HOME_BY_ROLE[r]);
    return role ? HOME_BY_ROLE[role] : '/forbidden';
  }

  /** Opciones del menú lateral según los roles del usuario. */
  menu(): MenuItem[] {
    return this.roles().flatMap(role => MENU_BY_ROLE[role] ?? []);
  }

  /** Nombre del rol para mostrar, por ejemplo "Reclutador". */
  roleLabel(): string {
    const role = this.roles().find(r => ROLE_LABELS[r]);
    return role ? ROLE_LABELS[role] : '';
  }
}

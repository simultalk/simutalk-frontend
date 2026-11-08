import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription, catchError, forkJoin, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from './auth.service';
import { RecruitmentService } from './recruitment.service';
import { ROLE_CANDIDATE, ROLE_RECRUITER } from '../models/menu';
import { Application, InterviewSession, JobPosting } from '../models/recruitment.model';
import {
  AppNotification,
  NotificationKind,
  NotificationSnapshot,
  NotificationStore,
} from '../models/notification.model';

/** Cada cuánto se revisa si hay novedades (ms). */
const POLL_INTERVAL = 60_000;
/** Días antes del cierre o del vencimiento en que se avisa. */
const SOON_DAYS = 3;
/** Máximo de notificaciones guardadas por usuario. */
const MAX_ITEMS = 60;
/** Cuánto se queda en pantalla un aviso emergente (ms). */
const TOAST_DURATION = 6000;

const EMPTY_SNAPSHOT: NotificationSnapshot = {
  applicationStatus: {},
  postingIds: [],
  sessionIds: [],
  applicationIds: [],
};

/** Lo que trae cada revisión del servidor, según el rol. */
interface CandidateData {
  applications: Application[];
  postings: JobPosting[];
  sessions: InterviewSession[];
}

interface RecruiterData {
  postings: JobPosting[];
  applications: Application[];
}

/**
 * Centro de notificaciones.
 * El backend todavía no expone notificaciones, así que se arman en el navegador:
 * cada minuto se consultan las postulaciones, vacantes y entrevistas, se comparan con lo que
 * se vio la vez anterior y cada cambio se vuelve una notificación. Se guardan por usuario en
 * localStorage y, si la persona lo permite, también se muestran como notificaciones del sistema.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private auth = inject(AuthService);
  private recruitment = inject(RecruitmentService);
  private translate = inject(TranslateService);
  private router = inject(Router);

  private polling?: Subscription;
  private store = signal<NotificationStore>(this.emptyStore());

  /** Notificaciones, la más reciente primero. */
  readonly items = computed(() => this.store().items);
  readonly unreadCount = computed(() => this.store().items.filter((n) => !n.read).length);
  readonly pushEnabled = computed(() => this.store().pushEnabled);

  /** Avisos emergentes dentro de la app (esquina inferior derecha). */
  readonly toasts = signal<AppNotification[]>([]);

  /** Permiso del navegador: 'default' | 'granted' | 'denied' | 'unsupported'. */
  readonly permission = signal<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  /** Empieza a revisar novedades (lo llama el layout al entrar). */
  start(): void {
    this.stop();
    this.store.set(this.load());
    this.polling = timer(0, POLL_INTERVAL)
      .pipe(switchMap(() => this.check()))
      .subscribe();
  }

  stop(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
    this.toasts.set([]);
  }

  /** Revisa ahora mismo (botón "Actualizar"). */
  refresh(): void {
    this.check().subscribe();
  }

  markRead(id: string): void {
    this.update((s) => ({ ...s, items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }

  markAllRead(): void {
    this.update((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read: true })) }));
  }

  remove(id: string): void {
    this.update((s) => ({ ...s, items: s.items.filter((n) => n.id !== id) }));
  }

  clearAll(): void {
    this.update((s) => ({ ...s, items: [] }));
  }

  dismissToast(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  /** Abre el enlace de la notificación y la marca como leída. */
  open(n: AppNotification): void {
    this.markRead(n.id);
    this.dismissToast(n.id);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  /** Pide permiso al navegador y activa las notificaciones del sistema. */
  async enablePush(): Promise<void> {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    this.permission.set(result);
    this.update((s) => ({ ...s, pushEnabled: result === 'granted' }));
    if (result === 'granted') {
      this.showSystemNotification({
        id: 'push-enabled',
        kind: 'WELCOME',
        titleKey: 'notifications.messages.pushEnabledTitle',
        bodyKey: 'notifications.messages.pushEnabledBody',
        params: {},
        createdAt: new Date().toISOString(),
        read: true,
      });
    }
  }

  disablePush(): void {
    this.update((s) => ({ ...s, pushEnabled: false }));
  }

  /** Icono de Material para cada tipo. */
  icon(kind: NotificationKind): string {
    switch (kind) {
      case 'APPLICATION_STATUS':
        return 'swap_horiz';
      case 'INTERVIEW_INVITE':
        return 'videocam';
      case 'INTERVIEW_DEADLINE':
        return 'timer';
      case 'NEW_POSTING':
        return 'work';
      case 'POSTING_CLOSING':
        return 'event_busy';
      case 'NEW_APPLICATION':
        return 'person_add';
      case 'CANDIDATE_ASSESSED':
        return 'fact_check';
      default:
        return 'waving_hand';
    }
  }

  // ------------------------------------------------------------------
  // Revisión de novedades
  // ------------------------------------------------------------------

  private check(): Observable<void> {
    if (!this.auth.isLoggedIn()) return of(undefined);
    if (this.auth.hasAnyRole([ROLE_CANDIDATE])) {
      return this.loadCandidateData().pipe(map((data) => this.applyCandidate(data)));
    }
    if (this.auth.hasAnyRole([ROLE_RECRUITER])) {
      return this.loadRecruiterData().pipe(map((data) => this.applyRecruiter(data)));
    }
    return of(undefined);
  }

  private loadCandidateData(): Observable<CandidateData> {
    return forkJoin({
      applications: this.recruitment.getMyApplications().pipe(catchError(() => of([] as Application[]))),
      postings: this.recruitment.getPublishedJobPostings().pipe(catchError(() => of([] as JobPosting[]))),
    }).pipe(
      switchMap(({ applications, postings }) => {
        // Solo las postulaciones que ya pasaron a entrevista tienen sesión
        const withSession = applications.filter((a) => a.status !== 'RECEIVED' && a.status !== 'REJECTED');
        if (withSession.length === 0) return of({ applications, postings, sessions: [] });
        return forkJoin(
          withSession.map((a) =>
            this.recruitment.getInterviewSessionByApplication(a.id).pipe(catchError(() => of(null))),
          ),
        ).pipe(
          map((sessions) => ({
            applications,
            postings,
            sessions: sessions.filter((s): s is InterviewSession => s !== null),
          })),
        );
      }),
    );
  }

  private loadRecruiterData(): Observable<RecruiterData> {
    return this.recruitment.getMyJobPostings().pipe(
      catchError(() => of([] as JobPosting[])),
      switchMap((postings) => {
        const active = postings.filter((p) => p.status !== 'DRAFT');
        if (active.length === 0) return of({ postings, applications: [] });
        return forkJoin(
          active.map((p) =>
            this.recruitment.getApplicationsByJobPosting(p.id).pipe(catchError(() => of([] as Application[]))),
          ),
        ).pipe(map((lists) => ({ postings, applications: lists.flat() })));
      }),
    );
  }

  private applyCandidate({ applications, postings, sessions }: CandidateData): void {
    const store = this.store();
    const prev = store.snapshot;
    const first = !store.initialized;
    const titles = new Map(postings.map((p) => [p.id, p.title]));
    const appliedPostingIds = new Set(applications.map((a) => a.jobPostingId));
    const found: AppNotification[] = [];

    if (first) {
      found.push(this.make('WELCOME', 'welcome', { name: this.auth.username() ?? '' }, '/calendar'));
    }

    for (const a of applications) {
      const before = prev.applicationStatus[a.id];
      if (!first && before && before !== a.status) {
        found.push(
          this.make(
            'APPLICATION_STATUS',
            `status-${a.id}-${a.status}`,
            {
              posting: titles.get(a.jobPostingId) ?? a.jobPostingTitle ?? `#${a.jobPostingId}`,
              status: this.translate.instant(`recruitment.applicationStatus.${a.status.toLowerCase()}`),
            },
            '/recruitment/my-applications',
          ),
        );
      }
    }

    for (const s of sessions) {
      const posting = titles.get(s.jobPostingId) ?? `#${s.jobPostingId}`;
      const open = s.status === 'PENDING' || s.status === 'IN_PROGRESS';
      if (!first && open && !prev.sessionIds.includes(s.id)) {
        found.push(
          this.make(
            'INTERVIEW_INVITE',
            `invite-${s.id}`,
            { posting, date: this.formatDate(s.expiresAt) },
            `/interviews/take-interview/${s.applicationId}`,
          ),
        );
      }
      const days = this.daysUntil(s.expiresAt);
      if (open && days >= 0 && days <= SOON_DAYS) {
        found.push(
          this.make(
            'INTERVIEW_DEADLINE',
            `deadline-${s.id}-${s.expiresAt}`,
            { posting, days },
            `/interviews/take-interview/${s.applicationId}`,
          ),
        );
      }
    }

    if (!first) {
      const fresh = postings.filter((p) => !prev.postingIds.includes(p.id)).slice(0, 3);
      for (const p of fresh) {
        found.push(this.make('NEW_POSTING', `posting-${p.id}`, { posting: p.title }, `/recruitment/job-postings/${p.id}`));
      }
    }

    for (const p of postings) {
      const days = this.daysUntil(p.closingDate);
      if (!appliedPostingIds.has(p.id) && days >= 0 && days <= SOON_DAYS) {
        found.push(
          this.make('POSTING_CLOSING', `closing-${p.id}-${p.closingDate}`, { posting: p.title, days }, `/recruitment/job-postings/${p.id}`),
        );
      }
    }

    this.commit(found, first, {
      applicationStatus: Object.fromEntries(applications.map((a) => [a.id, a.status])),
      postingIds: postings.map((p) => p.id),
      sessionIds: sessions.map((s) => s.id),
      applicationIds: applications.map((a) => a.id),
    });
  }

  private applyRecruiter({ postings, applications }: RecruiterData): void {
    const store = this.store();
    const prev = store.snapshot;
    const first = !store.initialized;
    const titles = new Map(postings.map((p) => [p.id, p.title]));
    const found: AppNotification[] = [];

    if (first) {
      found.push(this.make('WELCOME', 'welcome', { name: this.auth.username() ?? '' }, '/calendar'));
    }

    if (!first) {
      // Postulantes nuevos, agrupados por vacante
      const fresh = applications.filter((a) => !prev.applicationIds.includes(a.id));
      const byPosting = new Map<number, number>();
      for (const a of fresh) byPosting.set(a.jobPostingId, (byPosting.get(a.jobPostingId) ?? 0) + 1);
      for (const [postingId, count] of byPosting) {
        const ids = fresh.filter((a) => a.jobPostingId === postingId).map((a) => a.id).join('-');
        found.push(
          this.make(
            'NEW_APPLICATION',
            `apps-${postingId}-${ids}`,
            { posting: titles.get(postingId) ?? `#${postingId}`, count },
            `/recruitment/my-job-postings/${postingId}/pipeline`,
          ),
        );
      }

      // Postulantes que terminaron la entrevista y ya tienen evaluación
      for (const a of applications) {
        const before = prev.applicationStatus[a.id];
        if (before && before !== a.status && a.status === 'ASSESSED') {
          found.push(
            this.make(
              'CANDIDATE_ASSESSED',
              `assessed-${a.id}`,
              { posting: titles.get(a.jobPostingId) ?? `#${a.jobPostingId}`, candidate: a.candidateName ?? `#${a.candidateId}` },
              '/assessment/ranking',
            ),
          );
        }
      }
    }

    for (const p of postings) {
      const days = this.daysUntil(p.closingDate);
      if (p.status === 'PUBLISHED' && days >= 0 && days <= SOON_DAYS) {
        found.push(
          this.make(
            'POSTING_CLOSING',
            `closing-${p.id}-${p.closingDate}`,
            { posting: p.title, days },
            `/recruitment/my-job-postings/${p.id}/pipeline`,
          ),
        );
      }
    }

    this.commit(found, first, {
      applicationStatus: Object.fromEntries(applications.map((a) => [a.id, a.status])),
      postingIds: postings.map((p) => p.id),
      sessionIds: [],
      applicationIds: applications.map((a) => a.id),
    });
  }

  /** Guarda lo nuevo (sin repetir) y avisa en pantalla y en el sistema. */
  private commit(found: AppNotification[], first: boolean, snapshot: NotificationSnapshot): void {
    const store = this.store();
    const known = new Set(store.items.map((n) => n.id));
    const added = found.filter((n, i) => !known.has(n.id) && found.findIndex((m) => m.id === n.id) === i);

    this.update((s) => ({
      ...s,
      initialized: true,
      snapshot,
      items: [...added, ...s.items].slice(0, MAX_ITEMS),
    }));

    if (added.length === 0) return;
    // En la primera revisión solo se muestra el aviso de bienvenida, sin ráfaga de emergentes
    const toShow = first ? added.filter((n) => n.kind === 'WELCOME') : added;
    this.toasts.update((list) => [...toShow, ...list].slice(0, 3));
    for (const n of toShow) {
      setTimeout(() => this.dismissToast(n.id), TOAST_DURATION);
      if (!first) this.showSystemNotification(n);
    }
  }

  private showSystemNotification(n: AppNotification): void {
    if (!this.store().pushEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    try {
      const notification = new Notification(this.translate.instant(n.titleKey, n.params), {
        body: this.translate.instant(n.bodyKey, n.params),
        icon: '/logo.svg',
        tag: n.id,
      });
      notification.onclick = () => {
        window.focus();
        this.open(n);
        notification.close();
      };
    } catch {
      // Algunos navegadores (p. ej. Chrome en Android) solo permiten notificaciones con service worker.
    }
  }

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------

  private make(kind: NotificationKind, id: string, params: Record<string, string | number>, link?: string): AppNotification {
    const key = kind
      .toLowerCase()
      .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    return {
      id,
      kind,
      titleKey: `notifications.messages.${key}Title`,
      bodyKey: `notifications.messages.${key}Body`,
      params,
      createdAt: new Date().toISOString(),
      read: false,
      link,
    };
  }

  /** Días que faltan hasta una fecha yyyy-MM-dd (0 = hoy, negativo = ya pasó). */
  private daysUntil(isoDate: string | null | undefined): number {
    if (!isoDate) return -1;
    const target = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  }

  private formatDate(isoDate: string): string {
    const lang = this.translate.getCurrentLang() ?? 'es-419';
    return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long' });
  }

  private storageKey(): string {
    return `simutalk.notifications.${this.auth.userId() ?? 'anon'}`;
  }

  private emptyStore(): NotificationStore {
    return { initialized: false, pushEnabled: false, items: [], snapshot: EMPTY_SNAPSHOT };
  }

  private load(): NotificationStore {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return this.emptyStore();
      const parsed = JSON.parse(raw) as NotificationStore;
      return { ...this.emptyStore(), ...parsed, snapshot: { ...EMPTY_SNAPSHOT, ...parsed.snapshot } };
    } catch {
      return this.emptyStore();
    }
  }

  private update(fn: (s: NotificationStore) => NotificationStore): void {
    this.store.update(fn);
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.store()));
    } catch {
      // Sin almacenamiento (modo privado): las notificaciones duran solo esta sesión.
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { RecruitmentService } from './recruitment.service';
import { ROLE_CANDIDATE } from '../models/menu';
import { Application, InterviewSession, JobPosting } from '../models/recruitment.model';

export type CalendarEventKind =
  | 'POSTING_CLOSING' // cierre de una vacante publicada
  | 'INTERVIEW_DEADLINE' // último día para rendir la entrevista (postulante)
  | 'INTERVIEW_DONE' // entrevista enviada (postulante)
  | 'APPLIED' // el postulante postuló ese día
  | 'APPLICATIONS_RECEIVED'; // el reclutador recibió postulaciones ese día

export interface CalendarEvent {
  id: string;
  date: string; // yyyy-MM-dd
  kind: CalendarEventKind;
  title: string;
  /** Dato extra: cantidad de postulaciones, si ya postuló, etc. */
  count?: number;
  applied?: boolean;
  link: string;
}

/**
 * Arma los eventos del calendario con los endpoints que ya existen:
 * - Postulante: cierre de las vacantes publicadas, sus postulaciones y sus entrevistas.
 * - Reclutador: cierre de sus vacantes y las postulaciones que recibió cada día.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private auth = inject(AuthService);
  private recruitment = inject(RecruitmentService);

  getEvents(): Observable<CalendarEvent[]> {
    return this.auth.hasAnyRole([ROLE_CANDIDATE]) ? this.candidateEvents() : this.recruiterEvents();
  }

  private candidateEvents(): Observable<CalendarEvent[]> {
    return forkJoin({
      postings: this.recruitment.getPublishedJobPostings().pipe(catchError(() => of([] as JobPosting[]))),
      applications: this.recruitment.getMyApplications().pipe(catchError(() => of([] as Application[]))),
    }).pipe(
      switchMap(({ postings, applications }) => {
        const withSession = applications.filter((a) => a.status !== 'RECEIVED' && a.status !== 'REJECTED');
        const sessions$ = withSession.length
          ? forkJoin(
              withSession.map((a) =>
                this.recruitment.getInterviewSessionByApplication(a.id).pipe(catchError(() => of(null))),
              ),
            )
          : of([] as (InterviewSession | null)[]);
        return sessions$.pipe(
          map((sessions) => {
            const titles = new Map(postings.map((p) => [p.id, p.title]));
            const applied = new Set(applications.map((a) => a.jobPostingId));
            const events: CalendarEvent[] = [];

            for (const p of postings) {
              if (!p.closingDate) continue;
              events.push({
                id: `closing-${p.id}`,
                date: p.closingDate.slice(0, 10),
                kind: 'POSTING_CLOSING',
                title: p.title,
                applied: applied.has(p.id),
                link: `/recruitment/job-postings/${p.id}`,
              });
            }

            for (const a of applications) {
              events.push({
                id: `applied-${a.id}`,
                date: toLocalDate(a.appliedAt ?? a.createdAt),
                kind: 'APPLIED',
                title: titles.get(a.jobPostingId) ?? a.jobPostingTitle ?? `#${a.jobPostingId}`,
                link: '/recruitment/my-applications',
              });
            }

            for (const s of sessions) {
              if (!s) continue;
              const title = titles.get(s.jobPostingId) ?? `#${s.jobPostingId}`;
              if (s.status === 'COMPLETED' && s.finishedAt) {
                events.push({
                  id: `done-${s.id}`,
                  date: toLocalDate(s.finishedAt),
                  kind: 'INTERVIEW_DONE',
                  title,
                  link: `/recruitment/my-applications/${s.applicationId}/feedback`,
                });
              } else if (s.status === 'PENDING' || s.status === 'IN_PROGRESS') {
                events.push({
                  id: `deadline-${s.id}`,
                  date: s.expiresAt.slice(0, 10),
                  kind: 'INTERVIEW_DEADLINE',
                  title,
                  link: `/interviews/take-interview/${s.applicationId}`,
                });
              }
            }
            return events;
          }),
        );
      }),
    );
  }

  private recruiterEvents(): Observable<CalendarEvent[]> {
    return this.recruitment.getMyJobPostings().pipe(
      catchError(() => of([] as JobPosting[])),
      switchMap((postings) => {
        const active = postings.filter((p) => p.status !== 'DRAFT');
        const apps$ = active.length
          ? forkJoin(
              active.map((p) =>
                this.recruitment.getApplicationsByJobPosting(p.id).pipe(catchError(() => of([] as Application[]))),
              ),
            )
          : of([] as Application[][]);
        return apps$.pipe(
          map((lists) => {
            const events: CalendarEvent[] = [];
            for (const p of active) {
              if (!p.closingDate) continue;
              events.push({
                id: `closing-${p.id}`,
                date: p.closingDate.slice(0, 10),
                kind: 'POSTING_CLOSING',
                title: p.title,
                link: `/recruitment/my-job-postings/${p.id}/pipeline`,
              });
            }
            // Postulaciones recibidas: una entrada por vacante y día
            active.forEach((p, i) => {
              const byDay = new Map<string, number>();
              for (const a of lists[i] ?? []) {
                const day = toLocalDate(a.appliedAt ?? a.createdAt);
                byDay.set(day, (byDay.get(day) ?? 0) + 1);
              }
              for (const [day, count] of byDay) {
                events.push({
                  id: `received-${p.id}-${day}`,
                  date: day,
                  kind: 'APPLICATIONS_RECEIVED',
                  title: p.title,
                  count,
                  link: `/recruitment/my-job-postings/${p.id}/pipeline`,
                });
              }
            });
            return events;
          }),
        );
      }),
    );
  }
}

/** Fecha local yyyy-MM-dd de un instante ISO (para no correr el día por la zona horaria). */
function toLocalDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

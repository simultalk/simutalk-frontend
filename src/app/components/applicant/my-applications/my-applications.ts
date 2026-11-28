import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import { RecruitmentService } from '../../../services/recruitment.service';
import { Application, ApplicationStatus } from '../../../models/recruitment.model';

/** Etapas desde las que el postulante ya puede ver su retroalimentación (US-22). */
const FEEDBACK_STATUSES: ApplicationStatus[] = ['ASSESSED', 'SHORTLISTED', 'REJECTED', 'HIRED'];

/** US-23: el postulante ve sus postulaciones con la vacante y el estado de cada una. */
@Component({
  selector: 'app-my-applications',
  imports: [DatePipe, LowerCasePipe, RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.css',
})
export class MyApplications implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly translate = inject(TranslateService);

  applications = signal<Application[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    this.recruitment.getMyApplications().subscribe({
      next: (data) => {
        this.applications.set(data);
        this.loading.set(false);
        this.fillMissingTitles(data);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || this.translate.instant('recruitment.myApplications.loadError'));
        this.loading.set(false);
      },
    });
  }

  canTakeInterview(app: Application): boolean {
    return app.status === 'INTERVIEWING';
  }

  canSeeFeedback(app: Application): boolean {
    return FEEDBACK_STATUSES.includes(app.status);
  }

  /** Si el API no trae el título de la vacante, lo busca por id para no mostrar solo un número. */
  private fillMissingTitles(apps: Application[]): void {
    const missing = [...new Set(apps.filter((a) => !a.jobPostingTitle).map((a) => a.jobPostingId))];
    if (missing.length === 0) return;
    forkJoin(
      missing.map((id) => this.recruitment.getJobPostingById(id).pipe(catchError(() => of(null)))),
    ).subscribe((jobs) => {
      const byId = new Map(jobs.filter((j) => !!j).map((j) => [j!.id, j!]));
      this.applications.update((list) =>
        list.map((a) => {
          const job = byId.get(a.jobPostingId);
          return job ? { ...a, jobPostingTitle: job.title, companyName: a.companyName ?? job.companyName } : a;
        }),
      );
    });
  }
}

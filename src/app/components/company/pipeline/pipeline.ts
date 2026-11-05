import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecruitmentService } from '../../../services/recruitment.service';
import { Application, ApplicationStatus, JobPosting } from '../../../models/recruitment.model';
import { InviteInterviewDialog } from '../invite-interview-dialog/invite-interview-dialog';

/** Etapas del pipeline, en el orden en que se muestran las columnas. */
export const PIPELINE_STAGES: ApplicationStatus[] = [
  'RECEIVED',
  'INTERVIEWING',
  'ASSESSED',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
];

/**
 * US-17 y US-18: pipeline de postulantes de una vacante. Una columna por etapa, filtro por etapa,
 * invitación a entrevista (RECEIVED) y avance de etapa con PATCH /applications/{id}/status.
 */
@Component({
  selector: 'app-pipeline',
  imports: [
    DatePipe,
    LowerCasePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  templateUrl: './pipeline.html',
  styleUrl: './pipeline.css',
})
export class Pipeline implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recruitment = inject(RecruitmentService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly stages = PIPELINE_STAGES;

  jobPostingId = 0;
  jobPosting = signal<JobPosting | null>(null);
  applications = signal<Application[]>([]);
  stageFilter = signal<ApplicationStatus | ''>('');
  loading = signal(true);
  errorMessage = signal('');
  /** Postulación que se está moviendo ahora mismo (para deshabilitar su botón). */
  movingId = signal<number | null>(null);

  /** Columnas visibles: todas, o solo la etapa elegida en el filtro. */
  visibleStages = computed(() => {
    const filter = this.stageFilter();
    return filter ? this.stages.filter((s) => s === filter) : this.stages;
  });

  ngOnInit(): void {
    this.jobPostingId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.jobPostingId) {
      this.loading.set(false);
      this.errorMessage.set(this.translate.instant('recruitment.pipeline.jobNotFound'));
      return;
    }
    this.recruitment.getJobPostingById(this.jobPostingId).subscribe({
      next: (job) => this.jobPosting.set(job),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.recruitment.getApplicationsByJobPosting(this.jobPostingId).subscribe({
      next: (data) => {
        this.applications.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || this.translate.instant('recruitment.pipeline.loadError'));
        this.loading.set(false);
      },
    });
  }

  applicationsIn(status: ApplicationStatus): Application[] {
    return this.applications().filter((a) => a.status === status);
  }

  /** Etapas a las que se puede intentar mover una postulación (el backend valida la transición). */
  targetsFor(app: Application): ApplicationStatus[] {
    return this.stages.filter((s) => s !== app.status);
  }

  /** Nombre del postulante; si el API no lo trae, un identificador con su número. */
  candidateLabel(app: Application): string {
    return app.candidateName ?? this.translate.instant('recruitment.pipeline.candidateFallback', { id: app.candidateId });
  }

  /** US-07: abre el diálogo de invitación; al volver, la postulación pasa a INTERVIEWING. */
  invite(app: Application): void {
    this.dialog
      .open(InviteInterviewDialog, { data: { applicationId: app.id } })
      .afterClosed()
      .subscribe((session) => {
        if (session) {
          this.notify(this.translate.instant('recruitment.pipeline.inviteSent'), 4000);
          this.load();
        }
      });
  }

  /** US-18: si el backend rechaza la transición, se muestra su mensaje y la tarjeta no se mueve. */
  moveTo(app: Application, status: ApplicationStatus): void {
    this.movingId.set(app.id);
    this.recruitment.updateApplicationStatus(app.id, status).subscribe({
      next: (updated) => {
        this.applications.update((list) =>
          list.map((a) => (a.id === app.id ? { ...a, status: updated.status ?? status } : a)),
        );
        this.movingId.set(null);
        const stage = this.translate.instant('recruitment.applicationStatus.' + status.toLowerCase());
        this.notify(this.translate.instant('recruitment.pipeline.movedTo', { stage }), 3000);
      },
      error: (err) => {
        this.movingId.set(null);
        this.notify(err.error?.message || this.translate.instant('recruitment.pipeline.moveError'), 6000);
      },
    });
  }

  private notify(message: string, duration: number): void {
    this.snackBar.open(message, this.translate.instant('recruitment.pipeline.close'), { duration });
  }
}

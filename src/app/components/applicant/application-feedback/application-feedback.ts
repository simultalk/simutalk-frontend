import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { RecruitmentService } from '../../../services/recruitment.service';
import { Assessment } from '../../../models/recruitment.model';

/**
 * US-22: retroalimentación al postulante. Obtiene la sesión de la postulación y con su id pide
 * la evaluación. El backend ya quita la posición en el ranking y las alertas de integridad.
 */
@Component({
  selector: 'app-application-feedback',
  imports: [DecimalPipe, RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './application-feedback.html',
  styleUrl: './application-feedback.css',
})
export class ApplicationFeedback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recruitment = inject(RecruitmentService);
  private readonly translate = inject(TranslateService);

  assessment = signal<Assessment | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    const applicationId = Number(this.route.snapshot.paramMap.get('id'));
    if (!applicationId) {
      this.loading.set(false);
      this.errorMessage.set(this.translate.instant('recruitment.applicationFeedback.applicationNotFound'));
      return;
    }
    this.recruitment
      .getInterviewSessionByApplication(applicationId)
      .pipe(switchMap((session) => this.recruitment.getAssessmentBySession(session.id)))
      .subscribe({
        next: (assessment) => {
          this.assessment.set(assessment);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(
            err.status === 404
              ? this.translate.instant('recruitment.applicationFeedback.notAvailable')
              : err.error?.message || this.translate.instant('recruitment.applicationFeedback.loadError'),
          );
          this.loading.set(false);
        },
      });
  }
}

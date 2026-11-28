import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { switchMap, tap } from 'rxjs';
import { RecruitmentService } from '../../../services/recruitment.service';
import { Assessment } from '../../../models/recruitment.model';
import { CommunicationAnalysisCard } from '../../shared/communication-analysis/communication-analysis';
import { CountUp } from '../../shared/count-up/count-up';

/** Puntaje máximo de un criterio y del puntaje ponderado (el backend usa 0 a 10). */
const MAX_SCORE = 10;

/**
 * US-22: retroalimentación al postulante. Obtiene la sesión de la postulación y con su id pide
 * la evaluación. El backend ya quita la posición en el ranking y las alertas de integridad.
 * Debajo se muestra el análisis de comunicación de la misma sesión.
 */
@Component({
  selector: 'app-application-feedback',
  imports: [DecimalPipe, RouterLink, MatButtonModule, MatIconModule, TranslatePipe, CommunicationAnalysisCard, CountUp],
  templateUrl: './application-feedback.html',
  styleUrl: './application-feedback.css',
})
export class ApplicationFeedback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recruitment = inject(RecruitmentService);
  private readonly translate = inject(TranslateService);

  assessment = signal<Assessment | null>(null);
  sessionId = signal<number | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  readonly maxScore = MAX_SCORE;

  /** Criterios del más fuerte al más débil. */
  readonly sortedCriteria = computed(() =>
    [...(this.assessment()?.criterionScores ?? [])].sort((a, b) => b.score - a.score),
  );

  ngOnInit(): void {
    const applicationId = Number(this.route.snapshot.paramMap.get('id'));
    if (!applicationId) {
      this.loading.set(false);
      this.errorMessage.set(this.translate.instant('recruitment.applicationFeedback.applicationNotFound'));
      return;
    }
    this.recruitment
      .getInterviewSessionByApplication(applicationId)
      .pipe(
        tap((session) => this.sessionId.set(session.id)),
        switchMap((session) => this.recruitment.getAssessmentBySession(session.id)),
      )
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

  /** Porcentaje (0-100) de un puntaje sobre 10, para barras y anillo. */
  percent(score: number): number {
    return Math.max(0, Math.min(100, (score / MAX_SCORE) * 100));
  }

  /** Nivel del puntaje para el color de la barra. */
  level(score: number): 'alto' | 'medio' | 'bajo' {
    if (score >= 7) return 'alto';
    if (score >= 5) return 'medio';
    return 'bajo';
  }
}

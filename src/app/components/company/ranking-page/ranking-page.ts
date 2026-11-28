import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ChartConfiguration,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { map, merge } from 'rxjs';
import { RankingService } from '../../../services/ranking';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPostingSummary, RankingBadge, RankingEntry, RankingResponse } from '../../../models/ranking';
import { getChartPalette } from '../../../analytics/chart-palette';
import { CountUp } from '../../shared/count-up/count-up';
import { RankingPodium } from '../ranking-podium/ranking-podium';

/** Colores de los criterios (marca primero, luego tonos que se distinguen bien entre sí). */
export const CRITERION_COLORS = ['#1b6e5e', '#ff9500', '#3e6ae1', '#2f9b82', '#c2410c', '#8e6bd8', '#0ea5a4', '#a35c00'];

const BADGE_ICONS: Record<RankingBadge, string> = {
  TOP_RANKED: 'emoji_events',
  STRONG_EVIDENCE: 'verified',
  VERIFIED_CERTIFICATIONS: 'workspace_premium',
  MISSING_MANDATORY_CERTIFICATION: 'report',
  INTEGRITY_ALERT: 'gpp_maybe',
};

/** Puntaje máximo de un criterio y del puntaje ponderado. */
const MAX_SCORE = 10;

@Component({
  selector: 'app-ranking-page',
  standalone: true,
  imports: [
    BaseChartDirective,
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslatePipe,
    CountUp,
    RankingPodium,
  ],
  templateUrl: './ranking-page.html',
  styleUrl: './ranking-page.css',
  providers: [
    provideCharts({
      registerables: [RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend],
    }),
  ],
})
export class RankingPageComponent implements OnInit {
  private readonly rankingService = inject(RankingService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly recruitmentService = inject(RecruitmentService);
  private readonly translate = inject(TranslateService);

  readonly jobPostings = signal<JobPostingSummary[]>([]);
  readonly ranking = signal<RankingEntry[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly loadingPostings = signal(false);
  readonly loadingRanking = signal(false);
  /** Fila con el desglose abierto. */
  readonly expanded = signal<number | null>(null);

  readonly anonymized = signal(false); // elección del reclutador con el toggle
  readonly forced = signal(false); // el backend obliga el modo anónimo
  readonly isAnonymous = computed(() => this.anonymized() || this.forced());

  readonly maxScore = MAX_SCORE;

  private readonly i18nTick = toSignal(
    merge(this.translate.onLangChange, this.translate.onTranslationChange).pipe(map(() => Date.now())),
    { initialValue: 0 },
  );

  /** Los tres primeros en orden de podio: 2.º, 1.º, 3.º. */
  readonly podium = computed(() => {
    const top = this.ranking().slice(0, 3);
    return [top[1], top[0], top[2]].filter((e): e is RankingEntry => !!e);
  });

  /** Criterios de la vacante (sacados del primer candidato), con su color. */
  readonly criteria = computed(() =>
    (this.ranking()[0]?.criteria ?? []).map((c, i) => ({
      id: c.criterionId,
      name: c.criterionName,
      weight: c.appliedWeight,
      color: CRITERION_COLORS[i % CRITERION_COLORS.length],
    })),
  );

  // Indicadores
  readonly average = computed(() => {
    const list = this.ranking();
    return list.length ? list.reduce((s, e) => s + e.weightedScore, 0) / list.length : 0;
  });
  readonly best = computed(() => this.ranking()[0]?.weightedScore ?? 0);
  readonly strongEvidence = computed(() => this.ranking().filter((e) => e.badges.includes('STRONG_EVIDENCE')).length);
  readonly alerts = computed(() => this.ranking().filter((e) => e.badges.includes('INTEGRITY_ALERT')).length);

  /** Radar: cómo se comparan los tres primeros en cada criterio. */
  readonly radarData = computed<ChartConfiguration<'radar'>['data']>(() => {
    this.i18nTick();
    const top = this.ranking().slice(0, 3);
    const colors = ['#1b6e5e', '#ff9500', '#3e6ae1'];
    return {
      labels: this.criteria().map((c) => c.name),
      datasets: top.map((e, i) => ({
        label: `#${e.position} ${this.displayName(e)}`,
        data: e.criteria.map((c) => c.score),
        borderColor: colors[i],
        backgroundColor: `${colors[i]}26`,
        pointBackgroundColor: colors[i],
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        fill: true,
      })),
    };
  });

  readonly radarOptions = computed<ChartConfiguration<'radar'>['options']>(() => {
    const p = getChartPalette();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1100, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: p.text, usePointStyle: true, pointStyle: 'circle', padding: 16, font: { family: 'Inter', size: 12 } },
        },
        tooltip: { padding: 10, cornerRadius: 8, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } },
      },
      scales: {
        r: {
          min: 0,
          max: MAX_SCORE,
          ticks: { stepSize: 2, color: p.text, backdropColor: 'transparent', font: { size: 10 } },
          grid: { color: p.grid },
          angleLines: { color: p.grid },
          pointLabels: { color: p.text, font: { family: 'Inter', size: 12, weight: 600 } },
        },
      },
    };
  });

  ngOnInit(): void {
    this.loadingPostings.set(true);
    this.rankingService.getActiveJobPostings().subscribe({
      next: (list: JobPostingSummary[]) => {
        this.jobPostings.set(list);
        this.loadingPostings.set(false);
        // Se abre la primera vacante para que la pantalla no empiece vacía
        if (list.length > 0 && this.selectedId() === null) this.onPostingChange(list[0].id);
      },
      error: (err: unknown) => {
        this.loadingPostings.set(false);
        this.showError(err);
      },
    });
  }

  onPostingChange(id: number): void {
    this.selectedId.set(id);
    this.forced.set(false);
    this.loadRanking(id);
  }

  onAnonymizedChange(checked: boolean): void {
    if (this.forced()) return;
    this.anonymized.set(checked);
    const id = this.selectedId();
    if (id !== null) this.loadRanking(id);
  }

  private loadRanking(id: number): void {
    this.ranking.set([]);
    this.expanded.set(null);
    this.loadingRanking.set(true);
    this.rankingService.getRanking(id, this.anonymized()).subscribe({
      next: (res: RankingResponse) => {
        this.forced.set(res.anonymizationForced === true);
        this.ranking.set([...res.entries].sort((a, b) => a.position - b.position));
        this.loadingRanking.set(false);
      },
      error: (err: unknown) => {
        this.loadingRanking.set(false);
        this.showError(err);
      },
    });
  }

  displayName(row: RankingEntry): string {
    return this.isAnonymous() ? (row.candidateCode ?? '—') : (row.candidateName ?? row.candidateCode ?? '—');
  }

  /** Iniciales para el avatar (en modo anónimo, un ícono). */
  initials(row: RankingEntry): string {
    if (this.isAnonymous() || !row.candidateName) return '';
    return row.candidateName
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  badgeIcon(b: RankingBadge): string {
    return BADGE_ICONS[b] ?? 'label';
  }

  /** Tono de la insignia: verde (positivas), ámbar (falta algo) o rojo (alerta). */
  badgeTone(b: RankingBadge): string {
    if (b === 'INTEGRITY_ALERT') return 'st-tag st-tag--danger';
    if (b === 'MISSING_MANDATORY_CERTIFICATION') return 'st-tag st-tag--warning';
    return 'st-tag';
  }

  /** Porcentaje (0-100) de un puntaje sobre 10. */
  percent(score: number): number {
    return Math.max(0, Math.min(100, (score / MAX_SCORE) * 100));
  }

  /** Cuánto aporta un criterio al puntaje final, como % del total posible. */
  contribution(score: number, weight: number): number {
    return ((score * weight) / 100 / MAX_SCORE) * 100;
  }

  color(index: number): string {
    return CRITERION_COLORS[index % CRITERION_COLORS.length];
  }

  toggle(row: RankingEntry, event: Event): void {
    event.stopPropagation();
    this.expanded.update((id) => (id === row.applicationId ? null : row.applicationId));
  }

  // El ranking trae la postulación; el detalle se abre por la sesión de entrevista de esa postulación
  goToAssessment(row: RankingEntry): void {
    this.recruitmentService.getInterviewSessionByApplication(row.applicationId).subscribe({
      next: (session) => this.router.navigate(['/assessment/sessions', session.id]),
      error: (err: unknown) => this.showError(err),
    });
  }

  private showError(err: any): void {
    const message = err?.error?.message ?? this.translate.instant('ranking.loadError');
    this.snackBar.open(message, this.translate.instant('ranking.close'), { duration: 5000 });
  }
}

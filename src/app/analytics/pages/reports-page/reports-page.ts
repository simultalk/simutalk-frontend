import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ArcElement,
  ChartConfiguration,
  DoughnutController,
  Filler,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { catchError, forkJoin, map, merge, of } from 'rxjs';
import { JobPostingSummary } from '../../../models/ranking';
import { RankingService } from '../../../services/ranking';
import { getChartPalette } from '../../chart-palette';
import { CriterionAverage, FunnelStageCode, FunnelStageCount } from '../../model/job-posting-report';
import { ReportService } from '../../services/report.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { ProfileService } from '../../../services/profile.service';
import { CarbonSavingsReport, CompanySummaryReport } from '../../../models/analytics.model';
import { CountUp } from '../../../components/shared/count-up/count-up';

/** Etapas que forman el embudo (los rechazados se muestran aparte). */
const FUNNEL_FLOW: FunnelStageCode[] = ['RECEIVED', 'INTERVIEWING', 'ASSESSED', 'SHORTLISTED', 'HIRED'];

/** Color de cada etapa (dona y embudo). */
const STAGE_COLORS: Record<FunnelStageCode, string> = {
  RECEIVED: '#7fd6c0',
  INTERVIEWING: '#2f9b82',
  ASSESSED: '#1b6e5e',
  SHORTLISTED: '#0f5c4f',
  HIRED: '#ff9500',
  REJECTED: '#a0aab8',
};

const MAX_SCORE = 10;

@Component({
  selector: 'app-reports-page',
  imports: [
    BaseChartDirective,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    TranslatePipe,
    CountUp,
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
  // Chart.js se registra aquí (y no en app.config) para que viaje en el chunk diferido
  providers: [
    provideCharts({
      registerables: [
        DoughnutController,
        ArcElement,
        RadarController,
        RadialLinearScale,
        PointElement,
        LineElement,
        Filler,
        Tooltip,
      ],
    }),
  ],
})
export class ReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly profileService = inject(ProfileService);
  private readonly rankingService = inject(RankingService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);

  /** Vacantes del selector: misma fuente que el selector de ranking-page. */
  readonly postings = signal<JobPostingSummary[]>([]);
  /** Indicadores generales de la empresa (GET /reports/companies/{id}/summary). */
  readonly summary = signal<CompanySummaryReport | null>(null);

  readonly jobPostingId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly funnel = signal<FunnelStageCount[]>([]);
  readonly criteria = signal<CriterionAverage[]>([]);
  /** US-21: huella de carbono evitada por la vacante. */
  readonly carbon = signal<CarbonSavingsReport | null>(null);

  /** Cambia cuando se carga o cambia el idioma, para recalcular las etiquetas. */
  private readonly i18nTick = toSignal(
    merge(this.translate.onLangChange, this.translate.onTranslationChange).pipe(map(() => Date.now())),
    { initialValue: 0 },
  );

  readonly selectedTitle = computed(() => this.postings().find((p) => p.id === this.jobPostingId())?.title ?? '');

  readonly total = computed(() => this.funnel().reduce((s, f) => s + f.count, 0));
  readonly funnelHasData = computed(() => this.total() > 0);
  readonly rejected = computed(() => this.funnel().find((f) => f.stage === 'REJECTED')?.count ?? 0);

  // ---------- US-19: embudo ----------
  /** Etapas del embudo con su ancho relativo y el % sobre el total. */
  readonly funnelRows = computed(() => {
    const rows = FUNNEL_FLOW.map((stage) => ({
      stage,
      count: this.funnel().find((f) => f.stage === stage)?.count ?? 0,
      color: STAGE_COLORS[stage],
    }));
    const max = Math.max(1, ...rows.map((r) => r.count));
    const total = Math.max(1, this.total());
    return rows.map((r) => ({
      ...r,
      width: 18 + (r.count / max) * 82, // nunca menos de 18 % para que se lea la etiqueta
      share: (r.count / total) * 100,
    }));
  });

  /** Dona: cómo se reparten hoy los postulantes entre las etapas. */
  readonly doughnutData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    this.i18nTick();
    const stages = this.funnel().filter((f) => f.count > 0);
    return {
      labels: stages.map((s) => this.translate.instant(`analytics.funnel.stage.${s.stage}`)),
      datasets: [
        {
          data: stages.map((s) => s.count),
          backgroundColor: stages.map((s) => STAGE_COLORS[s.stage]),
          borderWidth: 0,
          hoverOffset: 10,
          spacing: 3,
          borderRadius: 6,
        },
      ],
    };
  });

  readonly doughnutOptions = computed<ChartConfiguration<'doughnut'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    animation: { animateRotate: true, duration: 1200, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: { padding: 10, cornerRadius: 8, bodyFont: { family: 'Inter' }, titleFont: { family: 'Inter' } },
    },
  }));

  // ---------- US-20: puntaje medio por criterio ----------
  readonly sortedCriteria = computed(() => [...this.criteria()].sort((a, b) => b.averageScore - a.averageScore));
  readonly criteriaAverage = computed(() => {
    const list = this.criteria();
    return list.length ? list.reduce((s, c) => s + c.averageScore, 0) / list.length : 0;
  });

  readonly radarData = computed<ChartConfiguration<'radar'>['data']>(() => {
    this.i18nTick();
    const items = this.criteria();
    return {
      labels: items.map((c) => c.criterionName),
      datasets: [
        {
          label: this.translate.instant('analytics.criteria.series'),
          data: items.map((c) => c.averageScore),
          borderColor: '#1b6e5e',
          backgroundColor: 'rgba(27, 110, 94, 0.22)',
          pointBackgroundColor: '#ff9500',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  });

  readonly radarOptions = computed<ChartConfiguration<'radar'>['options']>(() => {
    const p = getChartPalette();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1100, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { padding: 10, cornerRadius: 8, bodyFont: { family: 'Inter' }, titleFont: { family: 'Inter' } },
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
    this.rankingService.getActiveJobPostings().subscribe({
      next: (list) => {
        this.postings.set(list);
        // Se abre la primera vacante para que la pantalla no empiece vacía
        if (list.length > 0 && this.jobPostingId() === null) this.onSelectPosting(list[0].id);
      },
      error: (err: any) =>
        this.snackBar.open(err?.error?.message ?? this.translate.instant('analytics.reports.loadError'), undefined, {
          duration: 5000,
        }),
    });

    // Indicadores de la empresa: si fallan, el resto de reportes sigue funcionando
    this.profileService.getMyCompany().subscribe({
      next: (company) =>
        this.analyticsService
          .getCompanySummary(company.id)
          .pipe(catchError(() => of(null)))
          .subscribe((s) => this.summary.set(s)),
      error: () => this.summary.set(null),
    });
  }

  onSelectPosting(id: number): void {
    this.jobPostingId.set(id);
    this.load();
  }

  load(): void {
    const id = this.jobPostingId();
    if (id === null) return;
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      funnel: this.reportService.getFunnel(id),
      criteria: this.reportService.getCriterionAverages(id),
      carbon: this.analyticsService.getCarbonSavings(id),
    }).subscribe({
      next: ({ funnel, criteria, carbon }) => {
        this.funnel.set(funnel);
        this.criteria.set(criteria);
        this.carbon.set(carbon);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  percent(score: number): number {
    return Math.max(0, Math.min(100, (score / MAX_SCORE) * 100));
  }

  /** Nivel del puntaje para el color de la barra. */
  level(score: number): 'alto' | 'medio' | 'bajo' {
    if (score >= 7) return 'alto';
    if (score >= 5) return 'medio';
    return 'bajo';
  }

  stageColor(stage: FunnelStageCode): string {
    return STAGE_COLORS[stage];
  }
}

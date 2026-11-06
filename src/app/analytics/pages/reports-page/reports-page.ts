import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BarController, BarElement, CategoryScale, ChartConfiguration, LinearScale, Tooltip } from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { forkJoin, map, merge } from 'rxjs';
import { JobPostingSummary } from '../../../models/ranking';
import { RankingService } from '../../../services/ranking';
import { getChartPalette } from '../../chart-palette';
import { CriterionAverage, FunnelStageCount } from '../../model/job-posting-report';
import { ReportService } from '../../services/report.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { CarbonSavingsReport } from '../../../models/analytics.model';

@Component({
  selector: 'app-reports-page',
  imports: [BaseChartDirective, DecimalPipe, MatCardModule, MatProgressBarModule, MatSelectModule, TranslatePipe],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
  // Chart.js se registra aquí (y no en app.config) para que viaje en el chunk diferido
  providers: [
    provideCharts({ registerables: [BarController, BarElement, CategoryScale, LinearScale, Tooltip] }),
  ],
})
export class ReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly rankingService = inject(RankingService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);

  /** Vacantes del selector: misma fuente que el selector de ranking-page. */
  readonly postings = signal<JobPostingSummary[]>([]);

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

  readonly funnelHasData = computed(() => this.funnel().some((s) => s.count > 0));
  readonly criteriaHeight = computed(() => Math.max(160, this.criteria().length * 48 + 72));

  // ---------- US-19: embudo (barras verticales) ----------
  readonly funnelChart = computed<ChartConfiguration<'bar'>['data']>(() => {
    this.i18nTick();
    const p = getChartPalette();
    const stages = this.funnel();
    return {
      labels: stages.map((s) => this.translate.instant(`analytics.funnel.stage.${s.stage}`)),
      datasets: [
        {
          label: this.translate.instant('analytics.funnel.series'),
          data: stages.map((s) => s.count),
          // Etapas de avance en primario; descartados en neutro; contratados en acento.
          backgroundColor: stages.map((s) =>
            s.stage === 'REJECTED' ? p.neutral : s.stage === 'HIRED' ? p.accent : p.primary,
          ),
          borderRadius: 4,
          maxBarThickness: 64,
        },
      ],
    };
  });

  readonly funnelOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const p = getChartPalette();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: p.text } },
        y: { beginAtZero: true, ticks: { precision: 0, color: p.text }, grid: { color: p.grid } },
      },
    };
  });

  // ---------- US-20: puntaje medio por criterio (barras horizontales) ----------
  readonly criteriaChart = computed<ChartConfiguration<'bar'>['data']>(() => {
    this.i18nTick();
    const p = getChartPalette();
    const items = this.criteria();
    return {
      labels: items.map((c) => c.criterionName),
      datasets: [
        {
          label: this.translate.instant('analytics.criteria.series'),
          data: items.map((c) => c.averageScore),
          backgroundColor: p.primary,
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    };
  });

  readonly criteriaOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const p = getChartPalette();
    return {
      indexAxis: 'y', // esto vuelve las barras horizontales
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: p.text }, grid: { color: p.grid } },
        y: { ticks: { color: p.text }, grid: { display: false } },
      },
    };
  });

  ngOnInit(): void {
    this.rankingService.getActiveJobPostings().subscribe({
      next: (list) => this.postings.set(list),
      error: (err: any) =>
        this.snackBar.open(err?.error?.message ?? 'No se pudo cargar la información.', 'Cerrar', {
          duration: 5000,
        }),
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
}
import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecruitmentService } from '../../../services/recruitment.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { JobPosting } from '../../../models/recruitment.model';
import { CarbonSavingsReport } from '../../../models/analytics.model';

/** US-21: huella de carbono evitada por vacante. */
@Component({
  selector: 'app-reports',
  imports: [DecimalPipe, MatFormFieldModule, MatSelectModule, TranslatePipe],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  private i18n = inject(TranslateService);
  private recruitmentService = inject(RecruitmentService);
  private analyticsService = inject(AnalyticsService);

  jobPostings = signal<JobPosting[]>([]);
  selectedId = signal<number | null>(null);
  carbon = signal<CarbonSavingsReport | null>(null);
  loading = signal(true);
  loadingReport = signal(false);
  errorMessage = signal('');
  reportError = signal('');

  ngOnInit(): void {
    this.recruitmentService.getMyJobPostings().subscribe({
      next: (list) => {
        // Las vacantes en borrador todavía no tienen postulantes
        const visibles = list.filter((j) => j.status !== 'DRAFT');
        this.jobPostings.set(visibles);
        this.loading.set(false);
        if (visibles.length > 0) this.select(visibles[0].id);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || this.i18n.instant('analytics.reports.loadError'));
        this.loading.set(false);
      },
    });
  }

  select(jobPostingId: number): void {
    this.selectedId.set(jobPostingId);
    this.carbon.set(null);
    this.reportError.set('');
    this.loadingReport.set(true);
    this.analyticsService.getCarbonSavings(jobPostingId).subscribe({
      next: (report) => {
        // Si cambió de vacante mientras cargaba, se ignora la respuesta vieja
        if (this.selectedId() !== jobPostingId) return;
        this.carbon.set(report);
        this.loadingReport.set(false);
      },
      error: (err) => {
        if (this.selectedId() !== jobPostingId) return;
        this.reportError.set(err.error?.message || this.i18n.instant('analytics.reports.carbonError'));
        this.loadingReport.set(false);
      },
    });
  }
}

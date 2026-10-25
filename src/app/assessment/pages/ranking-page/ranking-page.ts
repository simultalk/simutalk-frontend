import { DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { RankingService } from '../../services/ranking';
import {
  JobPostingSummary,
  RankingBadge,
  RankingEntry,
  RankingResponse,
} from '../../model/ranking';

interface BadgeConfig {
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-ranking-page',
  standalone: true,
  imports: [
    DecimalPipe,
    NgClass,
    MatChipsModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './ranking-page.html',
  styleUrl: './ranking-page.css',
})
export class RankingPageComponent implements OnInit {
  private readonly rankingService = inject(RankingService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly jobPostings = signal<JobPostingSummary[]>([]);
  readonly ranking = signal<RankingEntry[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly loadingPostings = signal(false);
  readonly loadingRanking = signal(false);

  readonly displayedColumns = [
    'position',
    'candidate',
    'weightedScore',
    'breakdown',
    'badges',
  ];

  private readonly badgeConfig: Record<RankingBadge, BadgeConfig> = {
    TOP_RANKED: { label: 'Mejor ranking', cssClass: 'badge--top' },
    STRONG_EVIDENCE: { label: 'Evidencia sólida', cssClass: 'badge--evidence' },
    VERIFIED_CERTIFICATIONS: { label: 'Certificaciones verificadas', cssClass: 'badge--verified' },
    MISSING_MANDATORY_CERTIFICATION: { label: 'Falta certificación obligatoria', cssClass: 'badge--missing' },
    INTEGRITY_ALERT: { label: 'Alerta de integridad', cssClass: 'badge--alert' },
  };

  ngOnInit(): void {
    this.loadingPostings.set(true);
    this.rankingService.getActiveJobPostings().subscribe({
      next: (list: JobPostingSummary[]) => {
        this.jobPostings.set(list);
        this.loadingPostings.set(false);
      },
      error: (err: unknown) => {
        this.loadingPostings.set(false);
        this.showError(err);
      },
    });
  }

  onPostingChange(id: number): void {
    this.selectedId.set(id);
    this.ranking.set([]);
    this.loadingRanking.set(true);
    this.rankingService.getRanking(id).subscribe({
      next: (res: RankingResponse) => {
        this.ranking.set(res.entries);
        this.loadingRanking.set(false);
      },
      error: (err: unknown) => {
        this.loadingRanking.set(false);
        this.showError(err);
      },
    });
  }

  badge(b: RankingBadge): BadgeConfig {
    return this.badgeConfig[b] ?? { label: b, cssClass: '' };
  }

  goToAssessment(row: RankingEntry): void {
    this.router.navigate(['/assessment/sessions', row.interviewSessionId]);
  }

  private showError(err: any): void {
    const message = err?.error?.message ?? 'No se pudo cargar la información.';
    this.snackBar.open(message, 'Cerrar', { duration: 5000 });
  }
}
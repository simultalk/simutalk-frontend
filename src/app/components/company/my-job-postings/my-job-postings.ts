import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPosting } from '../../../models/recruitment.model';

@Component({
  selector: 'app-my-job-postings',
  imports: [DatePipe, RouterLink, MatButtonModule, MatSnackBarModule],
  templateUrl: './my-job-postings.html',
  styleUrl: './my-job-postings.css',
})
export class MyJobPostings implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private snackBar = inject(MatSnackBar);

  jobPostings = signal<JobPosting[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  // Texto en español para cada estado del backend
  statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicada',
    CLOSED: 'Cerrada',
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recruitmentService.getMyJobPostings().subscribe({
      next: (data) => {
        this.jobPostings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudieron cargar tus vacantes.');
        this.loading.set(false);
      },
    });
  }

  remove(job: JobPosting): void {
    if (!confirm(`¿Eliminar la vacante "${job.title}"? No se puede deshacer.`)) return;

    this.recruitmentService.deleteJobPosting(job.id).subscribe({
      next: () => {
        this.snackBar.open('Vacante eliminada.', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'No se pudo eliminar la vacante.', 'OK', {
          duration: 5000,
        });
      },
    });
  }
}

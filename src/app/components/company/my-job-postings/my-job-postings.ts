import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPosting } from '../../../models/recruitment.model';

@Component({
  selector: 'app-my-job-postings',
  imports: [DatePipe, RouterLink, MatButtonModule, MatSnackBarModule, TranslatePipe],
  templateUrl: './my-job-postings.html',
  styleUrl: './my-job-postings.css',
})
export class MyJobPostings implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private i18n = inject(TranslateService);
  private snackBar = inject(MatSnackBar);

  jobPostings = signal<JobPosting[]>([]);
  loading = signal(true);
  errorMessage = signal('');


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
        this.errorMessage.set(err.error?.message || this.i18n.instant('recruitment.myJobPostings.loadError'));
        this.loading.set(false);
      },
    });
  }

  remove(job: JobPosting): void {
    if (!confirm(this.i18n.instant('recruitment.myJobPostings.confirmDelete', { title: job.title }))) return;

    this.recruitmentService.deleteJobPosting(job.id).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.instant('recruitment.myJobPostings.deleted'), 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.instant('recruitment.myJobPostings.deleteError'), 'OK', {
          duration: 5000,
        });
      },
    });
  }

  // PATCH /job-postings/{id}/status con CLOSED: deja de recibir postulaciones
  close(job: JobPosting): void {
    if (!confirm(this.i18n.instant('recruitment.myJobPostings.confirmClose', { title: job.title }))) return;

    this.recruitmentService.changeJobPostingStatus(job.id, 'CLOSED').subscribe({
      next: () => {
        this.snackBar.open(this.i18n.instant('recruitment.myJobPostings.closed'), 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.instant('recruitment.myJobPostings.closeError'), 'OK', {
          duration: 5000,
        });
      },
    });
  }
}

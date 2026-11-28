import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPosting } from '../../../models/recruitment.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-detail-job-posting',
  imports: [DatePipe, MatButtonModule, TranslatePipe],
  templateUrl: './detail-job-posting.component.html',
  styleUrl: './detail-job-posting.component.css',
})
export class DetailJobPostingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recruitmentService = inject(RecruitmentService);

  jobPosting = signal<JobPosting | null>(null);
  loading = signal(true);
  applying = signal(false);
  alreadyAppliedOrBlocked = signal(false);
  successMessage = signal('');
  /** Clave de traducción, o mensaje del backend que el interceptor ya tradujo. */
  errorMessage = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadJobDetail(id);
    } else {
      this.loading.set(false);
      this.errorMessage.set('recruitment.jobDetail.notFound');
    }
  }

  loadJobDetail(id: number): void {
    this.loading.set(true);
    this.recruitmentService.getJobPostingById(id).subscribe({
      next: (job) => {
        this.jobPosting.set(job);
        if (job.status !== 'PUBLISHED') {
          this.alreadyAppliedOrBlocked.set(true);
          this.errorMessage.set('recruitment.jobDetail.notPublished');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'recruitment.jobDetail.loadError');
        this.loading.set(false);
      },
    });
  }

  onApply(): void {
    const job = this.jobPosting();
    if (!job || this.alreadyAppliedOrBlocked()) return;

    this.applying.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.recruitmentService.applyToJobPosting(job.id).subscribe({
      next: () => {
        this.applying.set(false);
        this.alreadyAppliedOrBlocked.set(true);
        this.successMessage.set('recruitment.jobDetail.applySuccess');
      },
      error: (err) => {
        this.applying.set(false);
        if (err.status === 422) {
          // Ya postuló o la vacante no está publicada: mostramos el mensaje del backend
          this.alreadyAppliedOrBlocked.set(true);
          this.errorMessage.set(err.error?.message || 'recruitment.jobDetail.alreadyApplied');
        } else {
          this.errorMessage.set(err.error?.message || 'recruitment.jobDetail.applyError');
        }
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/recruitment/job-postings']);
  }
}

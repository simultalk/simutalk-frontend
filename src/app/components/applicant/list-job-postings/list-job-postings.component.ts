import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPosting } from '../../../models/recruitment.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-list-job-postings',
  imports: [DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, TranslatePipe],
  templateUrl: './list-job-postings.component.html',
  styleUrl: './list-job-postings.component.css',
})
export class ListJobPostingsComponent implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private router = inject(Router);

  jobPostings = signal<JobPosting[]>([]);
  searchTerm = signal('');
  loading = signal(true);
  errorMessage = signal('');

  // Se recalcula sola cuando cambian jobPostings o searchTerm.
  filteredPostings = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return this.jobPostings().filter((job) => job.title.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.loadPublishedJobs();
  }

  loadPublishedJobs(): void {
    this.loading.set(true);
    this.recruitmentService.getPublishedJobPostings().subscribe({
      next: (data) => {
        this.jobPostings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        // El interceptor ya tradujo el mensaje del backend; si no hay, se usa la clave.
        this.errorMessage.set(err.error?.message || 'recruitment.jobList.loadError');
        this.loading.set(false);
      },
    });
  }

  goToDetail(jobId: number): void {
    this.router.navigate(['/recruitment/job-postings', jobId]);
  }
}

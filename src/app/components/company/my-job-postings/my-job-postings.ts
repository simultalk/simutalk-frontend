import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPosting } from '../../../models/recruitment.model';

@Component({
  selector: 'app-my-job-postings',
  imports: [DatePipe, RouterLink, MatButtonModule],
  templateUrl: './my-job-postings.html',
  styleUrl: './my-job-postings.css',
})
export class MyJobPostings implements OnInit {
  private recruitmentService = inject(RecruitmentService);

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
}

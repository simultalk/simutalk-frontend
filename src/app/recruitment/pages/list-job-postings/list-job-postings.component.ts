import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RecruitmentService } from '../../services/recruitment.service';
import { JobPosting } from '../../model/recruitment.model';

@Component({
  selector: 'app-list-job-postings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list-job-postings.component.html'
})
export class ListJobPostingsComponent implements OnInit {
  jobPostings: JobPosting[] = [];
  filteredPostings: JobPosting[] = [];
  searchTerm: string = '';
  loading: boolean = true;
  errorMessage: string = '';

  constructor(
    private recruitmentService: RecruitmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPublishedJobs();
  }

  loadPublishedJobs(): void {
    this.loading = true;
    this.recruitmentService.getPublishedJobPostings().subscribe({
      next: (data) => {
        this.jobPostings = data;
        this.filteredPostings = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al cargar las vacantes publicadas.';
        this.loading = false;
      }
    });
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredPostings = this.jobPostings.filter((job) =>
      job.title.toLowerCase().includes(term)
    );
  }

  goToDetail(jobId: number): void {
    this.router.navigate(['/vacantes', jobId]);
  }
}
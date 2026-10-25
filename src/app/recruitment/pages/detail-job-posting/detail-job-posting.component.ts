import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RecruitmentService } from '../../services/recruitment.service';
import { JobPosting } from '../../model/recruitment.model';

@Component({
  selector: 'app-detail-job-posting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-job-posting.component.html',
  styleUrls: ['./detail-job-posting.component.css']
})
export class DetailJobPostingComponent implements OnInit {
  jobPosting?: JobPosting;
  loading: boolean = true;
  applying: boolean = false;
  alreadyAppliedOrBlocked: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recruitmentService: RecruitmentService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadJobDetail(id);
    }
  }

  loadJobDetail(id: number): void {
    this.loading = true;
    this.recruitmentService.getJobPostingById(id).subscribe({
      next: (job) => {
        this.jobPosting = job;
        if (job.status !== 'PUBLISHED') {
          this.alreadyAppliedOrBlocked = true;
          this.errorMessage = 'Solo se aceptan postulaciones a vacantes publicadas.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo cargar la vacante.';
        this.loading = false;
      }
    });
  }

  onApply(): void {
    if (!this.jobPosting || this.alreadyAppliedOrBlocked) return;

    this.applying = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.recruitmentService.applyToJobPosting(this.jobPosting.id).subscribe({
      next: () => {
        this.applying = false;
        this.alreadyAppliedOrBlocked = true;
        this.successMessage = 'Postulación registrada en estado RECIBIDA.';
      },
      error: (err) => {
        this.applying = false;
        if (err.status === 422) {
          this.alreadyAppliedOrBlocked = true;
          this.errorMessage = err.error?.message || 'Ya registraste una postulación para esta vacante.';
        } else {
          this.errorMessage = err.error?.message || 'Ocurrió un error al procesar tu postulación.';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/vacantes']);
  }
}
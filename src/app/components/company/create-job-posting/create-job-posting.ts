import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecruitmentService } from '../../../services/recruitment.service';

@Component({
  selector: 'app-create-job-posting',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  templateUrl: './create-job-posting.html',
  styleUrl: './create-job-posting.css',
})
export class CreateJobPosting implements OnInit {
  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  // id de la vacante cuando se edita; null cuando se crea
  jobPostingId: number | null = null;

  // Fecha de hoy (yyyy-mm-dd) para no dejar elegir fechas pasadas
  today = new Date().toISOString().slice(0, 10);

  saving = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    closingDate: ['', Validators.required],
    anonymizedScreening: [true],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.jobPostingId = Number(id);
    this.recruitmentService.getJobPostingById(this.jobPostingId).subscribe({
      next: (job) => {
        this.form.patchValue({
          title: job.title,
          description: job.description,
          closingDate: job.closingDate,
          anonymizedScreening: job.anonymizedScreening,
        });
        // El backend solo deja cambiar este dato mientras la vacante es borrador
        if (job.status !== 'DRAFT') {
          this.form.controls.anonymizedScreening.disable();
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo cargar la vacante.');
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');

    const data = this.form.getRawValue();
    const request = this.jobPostingId
      ? this.recruitmentService.updateJobPosting(this.jobPostingId, data)
      : this.recruitmentService.createJobPosting(data);

    request.subscribe({
      next: (job) => {
        this.saving.set(false);
        const message = this.jobPostingId
          ? `Vacante "${job.title}" actualizada.`
          : `Vacante "${job.title}" creada como borrador.`;
        this.snackBar.open(message, 'OK', { duration: 3000 });
        this.router.navigate(['/recruitment/my-job-postings']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo guardar la vacante.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/recruitment/my-job-postings']);
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RecruitmentService } from '../../../services/recruitment.service';

@Component({
  selector: 'app-create-job-posting',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './create-job-posting.html',
  styleUrl: './create-job-posting.css',
})
export class CreateJobPosting {
  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private router = inject(Router);

  // Fecha de hoy (yyyy-mm-dd) para no dejar elegir fechas pasadas
  today = new Date().toISOString().slice(0, 10);

  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    closingDate: ['', Validators.required],
    anonymizedScreening: [true],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');

    this.recruitmentService.createJobPosting(this.form.getRawValue()).subscribe({
      next: (job) => {
        this.saving.set(false);
        this.successMessage.set(`Vacante "${job.title}" creada como borrador.`);
        this.form.reset();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo crear la vacante.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/recruitment/my-job-postings']);
  }
}

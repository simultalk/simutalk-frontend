import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecruitmentService } from '../../../services/recruitment.service';
import {
  CriterionRequest,
  EvaluationCriterion,
  JobPosting,
} from '../../../models/recruitment.model';

@Component({
  selector: 'app-job-posting-criteria',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  templateUrl: './job-posting-criteria.html',
  styleUrl: './job-posting-criteria.css',
})
export class JobPostingCriteria implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private recruitmentService = inject(RecruitmentService);
  private snackBar = inject(MatSnackBar);

  jobPostingId = 0;
  job = signal<JobPosting | null>(null);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  // id del criterio que se está editando; null cuando se agrega uno nuevo
  editingId = signal<number | null>(null);

  criteria = computed(() => this.job()?.criteria ?? []);
  total = computed(() => this.criteria().reduce((sum, c) => sum + c.weight, 0));
  isDraft = computed(() => this.job()?.status === 'DRAFT');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    weight: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    criterionType: ['COMPETENCY' as 'COMPETENCY' | 'CERTIFICATION', Validators.required],
    certificationName: ['', Validators.maxLength(150)],
    mandatory: [false],
  });

  ngOnInit(): void {
    this.jobPostingId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.recruitmentService.getJobPostingById(this.jobPostingId).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo cargar la vacante.');
        this.loading.set(false);
      },
    });
  }

  edit(criterion: EvaluationCriterion): void {
    this.editingId.set(criterion.id);
    this.errorMessage.set('');
    this.form.setValue({
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      criterionType: criterion.criterionType,
      certificationName: criterion.certificationName ?? '',
      mandatory: criterion.mandatory,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const isCertification = value.criterionType === 'CERTIFICATION';
    if (isCertification && !value.certificationName.trim()) {
      this.errorMessage.set('Escribe el nombre de la certificación.');
      return;
    }

    const request: CriterionRequest = {
      name: value.name,
      description: value.description,
      weight: value.weight,
      criterionType: value.criterionType,
      certificationName: isCertification ? value.certificationName : null,
      mandatory: isCertification ? value.mandatory : false,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    const editingId = this.editingId();
    const call = editingId
      ? this.recruitmentService.updateCriterion(this.jobPostingId, editingId, request)
      : this.recruitmentService.addCriterion(this.jobPostingId, request);

    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(editingId ? 'Criterio actualizado.' : 'Criterio agregado.', 'OK', {
          duration: 3000,
        });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo guardar el criterio.');
      },
    });
  }

  remove(criterion: EvaluationCriterion): void {
    if (!confirm(`¿Quitar el criterio "${criterion.name}"?`)) return;

    this.recruitmentService.deleteCriterion(this.jobPostingId, criterion.id).subscribe({
      next: () => {
        this.snackBar.open('Criterio eliminado.', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'No se pudo quitar el criterio.', 'OK', {
          duration: 5000,
        });
      },
    });
  }
}

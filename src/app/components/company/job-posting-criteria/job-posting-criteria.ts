import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
import { AiSuggestionI18nService } from '../../../services/ai-suggestion-i18n.service';
import { JobPostingSteps } from '../job-posting-steps/job-posting-steps';
import {
  CriterionOrigin,
  CriterionRequest,
  CriterionSuggestion,
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
    JobPostingSteps,
    TranslatePipe,
  ],
  templateUrl: './job-posting-criteria.html',
  styleUrl: './job-posting-criteria.css',
})
export class JobPostingCriteria implements OnInit {
  private fb = inject(FormBuilder);
  private i18n = inject(TranslateService);
  // Traduce las sugerencias de IA al idioma elegido
  ai = inject(AiSuggestionI18nService);
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

  // Sugerencias de la IA que todavía no se usan (US-04)
  suggestions = signal<CriterionSuggestion[]>([]);
  suggesting = signal(false);
  // Origen del criterio que está en el formulario
  private origin: CriterionOrigin = 'MANUAL';

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
        this.errorMessage.set(err.error?.message || this.i18n.instant('recruitment.jobForm.loadError'));
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
    this.scrollToForm();
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.origin = 'MANUAL';
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
      this.errorMessage.set(this.i18n.instant('recruitment.criteria.certificationNameRequired'));
      return;
    }

    const request: CriterionRequest = {
      name: value.name,
      description: value.description,
      weight: value.weight,
      criterionType: value.criterionType,
      certificationName: isCertification ? value.certificationName : null,
      mandatory: isCertification ? value.mandatory : false,
      origin: this.origin,
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
        this.snackBar.open(this.i18n.instant(editingId ? 'recruitment.criteria.updated' : 'recruitment.criteria.added'), 'OK', {
          duration: 3000,
        });
        // Si venía de una sugerencia, ya no se muestra en la lista
        const name = request.name.toLowerCase();
        this.suggestions.update((list) => list.filter((s) => s.name.toLowerCase() !== name));
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || this.i18n.instant('recruitment.criteria.saveError'));
      },
    });
  }

  remove(criterion: EvaluationCriterion): void {
    if (!confirm(this.i18n.instant('recruitment.criteria.confirmRemove', { name: criterion.name }))) return;

    this.recruitmentService.deleteCriterion(this.jobPostingId, criterion.id).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.instant('recruitment.criteria.removed'), 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.instant('recruitment.criteria.removeError'), 'OK', {
          duration: 5000,
        });
      },
    });
  }

  // Pide a la IA criterios a partir de la descripción del puesto (US-04)
  suggest(): void {
    this.suggesting.set(true);
    this.recruitmentService.suggestCriteria(this.jobPostingId).subscribe({
      next: (data) => {
        this.suggesting.set(false);
        // No muestra las que ya están agregadas con el mismo nombre
        const existing = this.criteria().map((c) => c.name.toLowerCase());
        const nuevas = data.filter((s) => !existing.includes(s.name.toLowerCase()));
        this.suggestions.set(nuevas);
        if (nuevas.length === 0) {
          this.snackBar.open(this.i18n.instant('recruitment.criteria.noSuggestions'), 'OK', {
            duration: 3000,
          });
        }
      },
      error: (err) => {
        this.suggesting.set(false);
        this.snackBar.open(err.error?.message || this.i18n.instant('recruitment.criteria.suggestError'), 'OK', {
          duration: 5000,
        });
      },
    });
  }

  // Pasa la sugerencia al formulario; el peso lo decide el reclutador
  useSuggestion(suggestion: CriterionSuggestion): void {
    this.editingId.set(null);
    this.errorMessage.set('');
    this.origin = 'AI_SUGGESTED';
    this.form.reset();
    this.form.patchValue({
      name: suggestion.name,
      description: suggestion.description,
      criterionType: suggestion.criterionType,
      weight: Math.max(1, Math.min(100, 100 - this.total())),
    });
    this.scrollToForm();
  }

  discardSuggestion(suggestion: CriterionSuggestion): void {
    this.suggestions.update((list) => list.filter((s) => s !== suggestion));
  }

  private scrollToForm(): void {
    setTimeout(() => document.querySelector('.formulario')?.scrollIntoView({ behavior: 'smooth' }));
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { RecruitmentService } from '../../../services/recruitment.service';
import { JobPosting, QuestionSuggestion } from '../../../models/recruitment.model';
import { Question, QuestionOrigin } from '../../../models/question';

@Component({
  selector: 'app-job-posting-script',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DragDropModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  templateUrl: './job-posting-script.html',
  styleUrl: './job-posting-script.css',
})
export class JobPostingScript implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recruitmentService = inject(RecruitmentService);
  private snackBar = inject(MatSnackBar);

  jobPostingId = 0;
  job = signal<JobPosting | null>(null);
  questions = signal<Question[]>([]);
  loading = signal(true);
  saving = signal(false);
  publishing = signal(false);
  errorMessage = signal('');
  publishError = signal('');
  // id de la pregunta que se está editando; null cuando se agrega una nueva
  editingId = signal<number | null>(null);
  // Origen de la pregunta del formulario: se conserva al editar una sugerida por la IA
  private origin: QuestionOrigin = 'MANUAL';
  // Sugerencias de la IA que todavía no se usan (US-04)
  questionSuggestions = signal<QuestionSuggestion[]>([]);
  suggesting = signal(false);

  isDraft = computed(() => this.job()?.status === 'DRAFT');
  totalWeight = computed(() => (this.job()?.criteria ?? []).reduce((sum, c) => sum + c.weight, 0));
  // Solo los criterios de tipo competencia llevan preguntas
  competencies = computed(() =>
    (this.job()?.criteria ?? []).filter((c) => c.criterionType === 'COMPETENCY'),
  );
  // Competencias que todavía no tienen ninguna pregunta
  missing = computed(() =>
    this.competencies().filter((c) => !this.questions().some((q) => q.criterionId === c.id)),
  );

  form = this.fb.nonNullable.group({
    criterionId: [0, [Validators.required, Validators.min(1)]],
    statement: ['', [Validators.required, Validators.maxLength(500)]],
    maxDurationSeconds: [120, [Validators.required, Validators.min(30), Validators.max(600)]],
    allowsFollowUp: [false],
  });

  ngOnInit(): void {
    this.jobPostingId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    forkJoin({
      job: this.recruitmentService.getJobPostingById(this.jobPostingId),
      questions: this.recruitmentService.getQuestions(this.jobPostingId),
    }).subscribe({
      next: ({ job, questions }) => {
        this.job.set(job);
        this.questions.set([...questions].sort((a, b) => a.position - b.position));
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo cargar el guion.');
        this.loading.set(false);
      },
    });
  }

  criterionName(criterionId: number): string {
    return this.job()?.criteria?.find((c) => c.id === criterionId)?.name ?? '';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');

    const data = { ...this.form.getRawValue(), origin: this.origin };
    const editingId = this.editingId();
    const call = editingId
      ? this.recruitmentService.updateQuestion(this.jobPostingId, editingId, data)
      : this.recruitmentService.addQuestion(this.jobPostingId, data);

    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(editingId ? 'Pregunta actualizada.' : 'Pregunta agregada.', 'OK', {
          duration: 3000,
        });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo guardar la pregunta.');
      },
    });
  }

  edit(question: Question): void {
    this.editingId.set(question.id);
    this.origin = question.origin;
    this.errorMessage.set('');
    this.form.setValue({
      criterionId: question.criterionId,
      statement: question.statement,
      maxDurationSeconds: question.maxDurationSeconds,
      allowsFollowUp: question.allowsFollowUp,
    });
    setTimeout(() => document.querySelector('.formulario')?.scrollIntoView({ behavior: 'smooth' }));
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.origin = 'MANUAL';
    this.form.reset();
  }

  // Pide a la IA preguntas para el criterio elegido en el formulario (US-04)
  suggest(): void {
    const criterionId = this.form.controls.criterionId.value;
    if (!criterionId) {
      this.form.controls.criterionId.markAsTouched();
      return;
    }
    this.suggesting.set(true);
    this.recruitmentService.suggestQuestions(this.jobPostingId, criterionId).subscribe({
      next: (data) => {
        this.suggesting.set(false);
        // No muestra las que ya están en el guion
        const existing = this.questions().map((q) => q.statement.toLowerCase());
        const nuevas = data.filter((s) => !existing.includes(s.statement.toLowerCase()));
        this.questionSuggestions.set(nuevas);
        if (nuevas.length === 0) {
          this.snackBar.open('No hay sugerencias nuevas para este criterio.', 'OK', { duration: 3000 });
        }
      },
      error: (err) => {
        this.suggesting.set(false);
        this.snackBar.open(err.error?.message || 'No se pudieron obtener sugerencias.', 'OK', {
          duration: 5000,
        });
      },
    });
  }

  // Pasa la sugerencia al formulario; el tiempo y la repregunta los decide el reclutador
  useSuggestion(suggestion: QuestionSuggestion): void {
    this.editingId.set(null);
    this.origin = 'AI_SUGGESTED';
    this.form.patchValue({ criterionId: suggestion.criterionId, statement: suggestion.statement });
    this.questionSuggestions.update((list) => list.filter((s) => s !== suggestion));
  }

  discardSuggestion(suggestion: QuestionSuggestion): void {
    this.questionSuggestions.update((list) => list.filter((s) => s !== suggestion));
  }

  remove(question: Question): void {
    if (!confirm('¿Quitar esta pregunta del guion?')) return;

    this.recruitmentService.deleteQuestion(this.jobPostingId, question.id).subscribe({
      next: () => {
        this.snackBar.open('Pregunta eliminada.', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'No se pudo quitar la pregunta.', 'OK', {
          duration: 5000,
        });
      },
    });
  }

  // Al soltar una pregunta en otra posición se guarda el nuevo orden
  drop(event: CdkDragDrop<Question[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const list = [...this.questions()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.questions.set(list);

    this.recruitmentService
      .reorderQuestions(
        this.jobPostingId,
        list.map((q) => q.id),
      )
      .subscribe({
        next: () => this.snackBar.open('Orden guardado.', 'OK', { duration: 2000 }),
        error: (err) => {
          this.snackBar.open(err.error?.message || 'No se pudo guardar el orden.', 'OK', {
            duration: 5000,
          });
          this.load();
        },
      });
  }

  publish(): void {
    if (!confirm('¿Publicar la vacante? Después ya no podrás cambiar criterios ni preguntas.'))
      return;

    this.publishing.set(true);
    this.publishError.set('');
    this.recruitmentService.changeJobPostingStatus(this.jobPostingId, 'PUBLISHED').subscribe({
      next: () => {
        this.publishing.set(false);
        this.snackBar.open('Vacante publicada.', 'OK', { duration: 3000 });
        this.router.navigate(['/recruitment/my-job-postings']);
      },
      error: (err) => {
        this.publishing.set(false);
        // El backend explica qué falta (pesos, criterios o preguntas)
        this.publishError.set(err.error?.message || 'No se pudo publicar la vacante.');
      },
    });
  }
}

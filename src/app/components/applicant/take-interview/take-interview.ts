import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { InterviewSession } from '../../../models/interview-session';
import { Answer, Question } from '../../../models/question';
import { InterviewSessionService } from '../../../services/interview-session';
import { RecruitmentService } from '../../../services/recruitment.service';
import { SpeechDictationService } from '../../../services/speech-dictation';

type Step = 'loading' | 'unavailable' | 'intro' | 'question' | 'answered' | 'completed' | 'expired';

/** Segundos restantes desde los que el temporizador se muestra en rojo. */
export const WARNING_SECONDS = 30;

/**
 * US-08: el postulante rinde su entrevista asincrónica, una pregunta a la vez.
 * Ruta: /interviews/take-interview/:applicationId
 *
 * 1. GET /applications/{applicationId}/interview-session
 * 2. Empezar: POST /interview-sessions/{sessionId}/start (el guion solo se puede leer en IN_PROGRESS)
 * 3. GET /job-postings/{jobPostingId}/questions y GET /interview-sessions/{sessionId}/answers
 * 4. Enviar: POST /interview-sessions/{sessionId}/answers. Se guarda el id de cada respuesta para la
 *    repregunta (US-09). Si el postulante sale y vuelve, sigue en la primera pregunta sin responder.
 * 5. Terminar (US-10): POST /interview-sessions/{sessionId}/completion cuando ya respondió todo.
 */
@Component({
  selector: 'app-take-interview',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './take-interview.html',
  styleUrl: './take-interview.css',
})
export class TakeInterview {
  private readonly sessions = inject(InterviewSessionService);
  private readonly recruitment = inject(RecruitmentService);
  readonly dictation = inject(SpeechDictationService);

  readonly applicationId = Number(inject(ActivatedRoute).snapshot.paramMap.get('applicationId'));

  step = signal<Step>('loading');
  session = signal<InterviewSession | null>(null);
  jobTitle = signal('');
  questions = signal<Question[]>([]);
  /** Respuesta registrada de cada pregunta: questionId -> answerId (la US-09 lo usa como parentAnswerId). */
  answerIds = signal<Record<number, number>>({});
  index = signal(0);
  remainingSeconds = signal(0);
  sending = signal(false);
  /** Motivo cuando la entrevista no se puede abrir. */
  unavailableMessage = signal('');
  /** Error al empezar o al enviar una respuesta; la pantalla sigue usable. */
  errorMessage = signal('');
  /** El aviso de respuesta vacía solo aparece después de intentar enviar. */
  triedToSubmit = signal(false);

  /** Sin validador: un campo vacío no se pinta de rojo; submit() revisa que haya respuesta. */
  answer = new FormControl('', { nonNullable: true });

  current = computed<Question | undefined>(() => this.questions()[this.index()]);
  number = computed(() => this.index() + 1);
  answeredCount = computed(() => Object.keys(this.answerIds()).length);
  isLast = computed(() => this.answeredCount() === this.questions().length - 1);
  progress = computed(() =>
    this.questions().length === 0 ? 0 : (this.answeredCount() / this.questions().length) * 100,
  );
  timeUp = computed(() => this.step() === 'question' && this.remainingSeconds() === 0);
  warning = computed(() => this.remainingSeconds() <= WARNING_SECONDS);
  timeLabel = computed(() => formatSeconds(this.remainingSeconds()));

  private timer: ReturnType<typeof setInterval> | null = null;
  private questionStartedAt = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopTimer();
      this.dictation.stop();
    });
    this.load();
  }

  load(): void {
    if (!this.applicationId) {
      this.showUnavailable('La dirección no indica a qué postulación pertenece la entrevista.');
      return;
    }
    this.step.set('loading');
    this.sessions.getByApplication(this.applicationId).subscribe({
      next: (session) => {
        this.session.set(session);
        this.loadJobTitle(session.jobPostingId);
        this.showSessionStatus(session);
      },
      error: (error: HttpErrorResponse) => this.showUnavailable(loadErrorMessage(error)),
    });
  }

  start(): void {
    const session = this.session();
    if (!session || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.errorMessage.set('');
    this.sessions.start(session.id).subscribe({
      next: (started) => {
        this.session.set(started);
        this.loadScript(started);
      },
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        if (error.status === 422 && String(error.error?.message ?? '').includes('expired')) {
          this.step.set('expired');
          return;
        }
        this.errorMessage.set(sendErrorMessage(error));
      },
    });
  }

  submit(): void {
    const session = this.session();
    const question = this.current();
    const transcript = this.answer.value.trim();
    if (!session || !question || this.sending()) {
      return;
    }
    if (!transcript) {
      this.answer.setValue('');
      this.triedToSubmit.set(true);
      return;
    }
    this.dictation.stop();
    this.sending.set(true);
    this.errorMessage.set('');
    const elapsed = Math.round((Date.now() - this.questionStartedAt) / 1000);

    this.sessions
      .recordAnswer(session.id, {
        questionId: question.id,
        transcript,
        durationSeconds: Math.max(1, elapsed),
        followUp: false,
      })
      .subscribe({
        next: (saved) => {
          this.sending.set(false);
          this.answerIds.update((ids) => ({ ...ids, [saved.questionId]: saved.id }));
          this.showNextUnanswered();
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          if (error.status === 422 && String(error.error?.message ?? '').includes('already been answered')) {
            // Ya estaba guardada (por ejemplo, desde otra pestaña): se recarga el avance real.
            this.loadScript(session);
            return;
          }
          this.errorMessage.set(sendErrorMessage(error));
        },
      });
  }

  /** US-10: envía la entrevista. Después la empresa ya puede evaluarla y el postulante no puede cambiarla. */
  finish(): void {
    const session = this.session();
    if (!session || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.errorMessage.set('');
    this.sessions.complete(session.id).subscribe({
      next: (completed) => {
        this.sending.set(false);
        this.session.set(completed);
        this.step.set('completed');
      },
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        // El backend explica qué falta (por ejemplo, preguntas sin responder)
        this.errorMessage.set(error.error?.message || 'No se pudo enviar la entrevista. Inténtalo de nuevo.');
      },
    });
  }

  toggleDictation(): void {
    if (this.dictation.listening()) {
      this.dictation.stop();
      return;
    }
    this.dictation.start((text) => {
      const previous = this.answer.value.trim();
      this.answer.setValue(previous ? `${previous} ${text}` : text);
    });
  }

  private showSessionStatus(session: InterviewSession): void {
    switch (session.status) {
      case 'PENDING':
        this.step.set(isPastDue(session.expiresAt) ? 'expired' : 'intro');
        break;
      case 'IN_PROGRESS':
        this.loadScript(session);
        break;
      case 'COMPLETED':
        this.step.set('completed');
        break;
      case 'EXPIRED':
        this.step.set('expired');
        break;
    }
  }

  /** Carga el guion y las respuestas ya guardadas, y muestra la primera pregunta sin responder. */
  private loadScript(session: InterviewSession): void {
    this.step.set('loading');
    forkJoin({
      questions: this.sessions.getQuestions(session.jobPostingId),
      answers: this.sessions.getAnswers(session.id),
    }).subscribe({
      next: ({ questions, answers }) => {
        this.sending.set(false);
        this.questions.set([...questions].sort((a, b) => a.position - b.position));
        this.answerIds.set(regularAnswerIds(answers));
        this.showNextUnanswered();
      },
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        this.showUnavailable(loadErrorMessage(error));
      },
    });
  }

  private showNextUnanswered(): void {
    this.stopTimer();
    const next = this.questions().findIndex((question) => !(question.id in this.answerIds()));
    if (next === -1) {
      this.step.set('answered');
      return;
    }
    this.step.set('question');
    this.index.set(next);
    this.answer.reset('');
    this.triedToSubmit.set(false);
    this.remainingSeconds.set(this.questions()[next].maxDurationSeconds);
    this.questionStartedAt = Date.now();
    this.timer = setInterval(() => {
      this.remainingSeconds.update((seconds) => Math.max(0, seconds - 1));
      if (this.remainingSeconds() === 0) {
        this.stopTimer();
        this.dictation.stop();
      }
    }, 1000);
  }

  private loadJobTitle(jobPostingId: number): void {
    // Solo es para el encabezado: si falla, la entrevista sigue sin el título.
    this.recruitment.getJobPostingById(jobPostingId).subscribe({
      next: (job) => this.jobTitle.set(job.title),
      error: () => this.jobTitle.set(''),
    });
  }

  private showUnavailable(message: string): void {
    this.stopTimer();
    this.unavailableMessage.set(message);
    this.step.set('unavailable');
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/** 185 -> "3:05" */
export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** La fecha límite (yyyy-MM-dd) es el último día para empezar: vence al día siguiente. */
export function isPastDue(expiresAt: string, today = new Date()): boolean {
  const [year, month, day] = expiresAt.split('-').map(Number);
  const lastDay = new Date(year, month - 1, day);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return startOfToday > lastDay;
}

/** questionId -> answerId de las respuestas normales (las repreguntas no cuentan como respondida). */
export function regularAnswerIds(answers: Answer[]): Record<number, number> {
  const ids: Record<number, number> = {};
  for (const answer of answers) {
    if (!answer.followUp) {
      ids[answer.questionId] = answer.id;
    }
  }
  return ids;
}

export function loadErrorMessage(error: HttpErrorResponse): string {
  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    case 403:
      return 'Esta entrevista pertenece a otro postulante.';
    case 404:
      return 'Todavía no tienes una invitación a entrevista para esta postulación.';
    default:
      return 'No se pudo cargar la entrevista. Inténtalo de nuevo en unos minutos.';
  }
}

export function sendErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo enviar: revisa tu conexión. Tu respuesta sigue escrita, vuelve a intentarlo.';
  }
  if (error.status === 422) {
    return 'La entrevista ya no acepta respuestas. Recarga la página para ver su estado.';
  }
  return 'No se pudo enviar tu respuesta. Tu texto sigue escrito, vuelve a intentarlo.';
}

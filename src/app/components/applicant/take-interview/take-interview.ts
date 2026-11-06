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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { InterviewSession } from '../../../models/interview-session';
import { Answer, FollowUpQuestion, Question } from '../../../models/question';
import { InterviewSessionService } from '../../../services/interview-session';
import { RecruitmentService } from '../../../services/recruitment.service';
import { SpeechDictationService } from '../../../services/speech-dictation';
import { SpeechReaderService } from '../../../services/speech-reader';

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
 * 5. Terminar (US-10): POST /interview-sessions/{sessionId}/completion cuando ya respondió todo;
 *    la pantalla final muestra la duración total y la postulación pasa sola a ASSESSED.
 * Textos: claves interviews.takeInterview.* (docs/I18N.md). Los mensajes de error del backend llegan
 * ya traducidos por errorMessageInterceptor.
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
    TranslatePipe,
  ],
  templateUrl: './take-interview.html',
  styleUrl: './take-interview.css',
})
export class TakeInterview {
  private readonly sessions = inject(InterviewSessionService);
  private readonly recruitment = inject(RecruitmentService);
  readonly dictation = inject(SpeechDictationService);
  readonly reader = inject(SpeechReaderService);
  private readonly translate = inject(TranslateService);

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
  /** Clave de traducción del motivo cuando la entrevista no se puede abrir. */
  unavailableMessage = signal('');
  /** Clave de traducción, o mensaje del backend ya traducido, del error al empezar, enviar o terminar. */
  errorMessage = signal('');
  /** El aviso de respuesta vacía solo aparece después de intentar enviar. */
  triedToSubmit = signal(false);

  /** Sin validador: un campo vacío no se pinta de rojo; submit() revisa que haya respuesta. */
  answer = new FormControl('', { nonNullable: true });

  /** US-09: repregunta de la IA que se está respondiendo; null cuando es una pregunta del guion. */
  followUp = signal<FollowUpQuestion | null>(null);
  /** Mientras la IA prepara la repregunta. */
  preparingFollowUp = signal(false);
  /** Enunciado en pantalla: la repregunta, si hay una, o la pregunta del guion. */
  statement = computed(() => this.followUp()?.statement ?? this.current()?.statement ?? '');

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
  /** Duración total de la entrevista enviada, por ejemplo "12 min 05 s". */
  totalDuration = computed(() => formatDuration(this.session()?.totalDurationSeconds ?? 0));

  private timer: ReturnType<typeof setInterval> | null = null;
  private questionStartedAt = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopTimer();
      this.dictation.stop();
      this.reader.stop();
    });
    this.load();
  }

  load(): void {
    if (!this.applicationId) {
      this.showUnavailable('interviews.takeInterview.errors.noApplication');
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
        if (error.status === 422) {
          // Por ejemplo, venció la fecha límite: se recarga la sesión para mostrar su estado real.
          this.load();
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
    this.reader.stop();
    this.sending.set(true);
    this.errorMessage.set('');
    const elapsed = Math.round((Date.now() - this.questionStartedAt) / 1000);
    const followUp = this.followUp();

    this.sessions
      .recordAnswer(session.id, {
        questionId: followUp?.questionId ?? question.id,
        transcript,
        durationSeconds: Math.max(1, elapsed),
        followUp: followUp !== null,
        parentAnswerId: followUp?.parentAnswerId ?? null,
      })
      .subscribe({
        next: (saved) => {
          this.sending.set(false);
          if (followUp) {
            // Respondió la repregunta: sigue con la próxima pregunta del guion
            this.followUp.set(null);
            this.showNextUnanswered();
            return;
          }
          this.answerIds.update((ids) => ({ ...ids, [saved.questionId]: saved.id }));
          if (question.allowsFollowUp) {
            this.requestFollowUp(session.id, saved.id);
          } else {
            this.showNextUnanswered();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          if (error.status === 422) {
            // La pregunta ya estaba respondida (por ejemplo, desde otra pestaña) o la sesión cambió de
            // estado: se recarga el avance real. El mensaje llega traducido, así que no se compara su texto.
            this.load();
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
        // El backend explica qué falta (por ejemplo, preguntas sin responder), ya traducido.
        this.errorMessage.set(error.error?.message || 'interviews.takeInterview.errors.finishFailed');
      },
    });
  }

  /** Lee en voz alta el enunciado actual, o detiene la lectura. */
  toggleReading(): void {
    if (this.reader.speaking()) {
      this.reader.stop();
    } else {
      this.reader.speak(this.statement());
    }
  }

  toggleDictation(): void {
    if (this.dictation.listening()) {
      this.dictation.stop();
      return;
    }
    // El micrófono no debe captar la voz que lee la pregunta
    this.reader.stop();
    this.dictation.start((text) => {
      const previous = this.answer.value.trim();
      this.answer.setValue(previous ? `${previous} ${text}` : text);
    }, this.translate.getCurrentLang());
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
        // Si salió con una repregunta generada pero sin responder, se la vuelve a mostrar
        const pending = pendingFollowUp(answers);
        if (pending) {
          this.showFollowUp(pending);
        } else {
          this.showNextUnanswered();
        }
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
    this.startQuestion(this.questions()[next].maxDurationSeconds);
  }

  /** US-09: pide la repregunta a la IA. Si falla, la entrevista sigue sin ella. */
  private requestFollowUp(sessionId: number, answerId: number): void {
    this.stopTimer();
    this.preparingFollowUp.set(true);
    this.step.set('loading');
    this.sessions.generateFollowUp(sessionId, answerId).subscribe({
      next: (followUp) => {
        this.preparingFollowUp.set(false);
        this.showFollowUp(followUp);
      },
      error: () => {
        this.preparingFollowUp.set(false);
        this.showNextUnanswered();
      },
    });
  }

  private showFollowUp(followUp: FollowUpQuestion): void {
    this.stopTimer();
    const index = this.questions().findIndex((q) => q.id === followUp.questionId);
    this.followUp.set(followUp);
    this.step.set('question');
    if (index >= 0) this.index.set(index);
    this.startQuestion(this.questions()[index]?.maxDurationSeconds ?? 120);
  }

  /** Limpia la respuesta, arranca el temporizador y lee la pregunta en voz alta. */
  private startQuestion(seconds: number): void {
    this.answer.reset('');
    this.triedToSubmit.set(false);
    this.remainingSeconds.set(seconds);
    this.questionStartedAt = Date.now();
    this.timer = setInterval(() => {
      this.remainingSeconds.update((s) => Math.max(0, s - 1));
      if (this.remainingSeconds() === 0) {
        this.stopTimer();
        this.dictation.stop();
      }
    }, 1000);
    this.reader.speak(this.statement());
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

/** US-09: repregunta ya generada cuya respuesta todavía no se envió. */
export function pendingFollowUp(answers: Answer[]): FollowUpQuestion | null {
  const parent = answers.find(
    (a) => !a.followUp && a.followUpQuestion && !answers.some((b) => b.followUp && b.parentAnswerId === a.id),
  );
  return parent ? { parentAnswerId: parent.id, questionId: parent.questionId, statement: parent.followUpQuestion! } : null;
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

/** 725 -> "12 min 05 s" */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${String(seconds % 60).padStart(2, '0')} s`;
}

/** Clave de traducción del motivo por el que no se pudo abrir la entrevista. */
export function loadErrorMessage(error: HttpErrorResponse): string {
  switch (error.status) {
    case 0:
      return 'interviews.takeInterview.errors.network';
    case 403:
      return 'interviews.takeInterview.errors.forbidden';
    case 404:
      return 'interviews.takeInterview.errors.notInvited';
    default:
      return 'interviews.takeInterview.errors.loadFailed';
  }
}

/** Clave de traducción del error al empezar o al enviar una respuesta. */
export function sendErrorMessage(error: HttpErrorResponse): string {
  return error.status === 0
    ? 'interviews.takeInterview.errors.sendNetwork'
    : 'interviews.takeInterview.errors.sendFailed';
}

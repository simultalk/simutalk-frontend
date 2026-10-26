import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { INTERVIEW_DEMO } from '../../../models/interview-demo';
import { RecordAnswerRequest } from '../../../models/question';
import { SpeechDictationService } from '../../../services/speech-dictation';

type Step = 'intro' | 'question' | 'finished';

/** Segundos restantes desde los que el temporizador se muestra en rojo. */
export const WARNING_SECONDS = 30;

/**
 * US-08: el postulante rinde la entrevista asincrónica, una pregunta a la vez.
 * MAQUETA (Sprint 3): usa los datos de INTERVIEW_DEMO y guarda las respuestas en memoria. En la
 * conexión con el API, "Empezar" llama a POST /interview-sessions/{id}/start y "Enviar" a
 * POST /interview-sessions/{id}/answers con el mismo RecordAnswerRequest que se arma aquí.
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
  readonly dictation = inject(SpeechDictationService);

  readonly interview = INTERVIEW_DEMO;
  readonly questions = this.interview.questions;
  readonly totalMinutes = Math.ceil(
    this.questions.reduce((total, question) => total + question.maxDurationSeconds, 0) / 60,
  );

  step = signal<Step>('intro');
  index = signal(0);
  remainingSeconds = signal(0);
  answers = signal<RecordAnswerRequest[]>([]);
  /** El aviso de respuesta vacía solo aparece después de intentar enviar. */
  triedToSubmit = signal(false);

  /** Sin validador: un campo vacío no se pinta de rojo; submit() revisa que haya respuesta. */
  answer = new FormControl('', { nonNullable: true });

  current = computed(() => this.questions[this.index()]);
  number = computed(() => this.index() + 1);
  isLast = computed(() => this.number() === this.questions.length);
  /** Avance de la barra: preguntas ya respondidas sobre el total. */
  progress = computed(() => (this.answers().length / this.questions.length) * 100);
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
  }

  start(): void {
    this.step.set('question');
    this.showQuestion(0);
  }

  submit(): void {
    const transcript = this.answer.value.trim();
    if (!transcript) {
      this.answer.setValue('');
      this.triedToSubmit.set(true);
      return;
    }
    this.dictation.stop();
    this.stopTimer();
    const elapsed = Math.round((Date.now() - this.questionStartedAt) / 1000);
    this.answers.update((list) => [
      ...list,
      {
        questionId: this.current().id,
        transcript,
        durationSeconds: Math.max(1, elapsed),
        followUp: false,
      },
    ]);

    if (this.isLast()) {
      this.step.set('finished');
      return;
    }
    this.showQuestion(this.index() + 1);
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

  private showQuestion(index: number): void {
    this.index.set(index);
    this.answer.reset('');
    this.triedToSubmit.set(false);
    this.remainingSeconds.set(this.questions[index].maxDurationSeconds);
    this.questionStartedAt = Date.now();
    this.timer = setInterval(() => {
      this.remainingSeconds.update((seconds) => Math.max(0, seconds - 1));
      if (this.remainingSeconds() === 0) {
        this.stopTimer();
        this.dictation.stop();
      }
    }, 1000);
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

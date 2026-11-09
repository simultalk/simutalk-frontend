import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { InterviewSessionService } from '../../../services/interview-session';
import { AnswerCommunication, AnswerLength, CommunicationAnalysis } from '../../../models/communication-analysis.model';
import { CountUp } from '../count-up/count-up';

/**
 * Tarjeta "Cómo te comunicaste" (postulante) / "Cómo se comunicó" (reclutador).
 * Usa GET /interview-sessions/{id}/communication-analysis: reglas fijas, sin IA, no cambia el puntaje.
 * Si el análisis no está disponible (sin respuestas, sin permiso), la tarjeta no se muestra.
 */
@Component({
  selector: 'app-communication-analysis',
  imports: [MatIconModule, TranslatePipe, CountUp],
  templateUrl: './communication-analysis.html',
  styleUrl: './communication-analysis.css',
})
export class CommunicationAnalysisCard {
  private sessions = inject(InterviewSessionService);

  readonly sessionId = input.required<number>();
  /** El texto cambia de "te" a "se" y solo el postulante ve consejos. */
  readonly audience = input<'candidate' | 'recruiter'>('candidate');

  readonly analysis = signal<CommunicationAnalysis | null>(null);
  readonly loading = signal(true);
  /** Respuesta con el detalle abierto. */
  readonly open = signal<number | null>(null);

  readonly isCandidate = computed(() => this.audience() === 'candidate');

  /** Etiqueta de cada respuesta: "Respuesta 1", "Repregunta de la respuesta 1"… */
  readonly rows = computed(() => {
    let regular = 0;
    return (this.analysis()?.answers ?? []).map((a) => {
      if (!a.followUp) regular++;
      return { ...a, number: regular };
    });
  });

  /** La muletilla más usada define el ancho de 100 % en las barras de muletillas. */
  readonly maxFiller = computed(() => Math.max(1, ...(this.analysis()?.fillerWords ?? []).map((f) => f.count)));

  /** Consejos basados solo en los datos (sin umbrales inventados). */
  readonly tips = computed(() => {
    const a = this.analysis();
    if (!a || !this.isCandidate()) return [];
    const tips: string[] = [];
    if (a.answersWithConcreteExample < a.answerCount) tips.push('communication.tipExample');
    if (a.answersWithResult < a.answerCount) tips.push('communication.tipResult');
    if (a.fillerWords.length > 0) tips.push('communication.tipFiller');
    if (a.answers.some((x) => x.length === 'SHORT')) tips.push('communication.tipShort');
    return tips;
  });

  constructor() {
    effect(() => this.load(this.sessionId()));
  }

  private load(id: number): void {
    if (!id) return;
    this.loading.set(true);
    this.sessions.getCommunicationAnalysis(id).subscribe({
      next: (a) => {
        this.analysis.set(a.answerCount > 0 ? a : null);
        this.loading.set(false);
      },
      // Es información complementaria: si falla, no se muestra la tarjeta
      error: () => {
        this.analysis.set(null);
        this.loading.set(false);
      },
    });
  }

  toggle(answerId: number): void {
    this.open.update((id) => (id === answerId ? null : answerId));
  }

  lengthClass(length: AnswerLength): string {
    switch (length) {
      case 'SHORT':
        return 'st-tag st-tag--warning';
      case 'LONG':
        return 'st-tag st-tag--neutral';
      default:
        return 'st-tag';
    }
  }

  /** Porcentaje para las barras "con ejemplo" y "con resultado". */
  share(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  hasEvidence(a: AnswerCommunication): boolean {
    return !!a.concreteExampleEvidence || !!a.resultEvidence;
  }
}

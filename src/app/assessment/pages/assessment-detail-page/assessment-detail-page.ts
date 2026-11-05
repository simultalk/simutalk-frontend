import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin, map, of } from 'rxjs';
import { AssessmentService } from '../../../services/assessment.service';
import {
  Assessment,
  Evidence,
  InterviewAnswer,
  IntegritySeverity,
} from '../../../models/assessment.model';

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

interface EvidenceAnswerView {
  answerId: number;
  label: string;
  segments: TextSegment[];
}

interface CriterionView {
  id: number;
  name: string;
  weight: number;
  score: number;
  evidenceCount: number;
  answers: EvidenceAnswerView[];
}

type PageState = 'loading' | 'missing' | 'error' | 'ready';
type EvidenceEntry = readonly [number, Evidence[]];

/**
 * Parte el texto en fragmentos normales y resaltados según los offsets.
 * Ajusta offsets fuera de rango y une rangos que se superponen.
 */
export function buildSegments(transcript: string, evidences: Evidence[]): TextSegment[] {
  const length = transcript.length;

  const ranges = evidences
    .map((e) => ({
      start: Math.max(0, Math.min(e.startOffset, length)),
      end: Math.max(0, Math.min(e.endOffset, length)),
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) {
      segments.push({ text: transcript.slice(cursor, r.start), highlighted: false });
    }
    segments.push({ text: transcript.slice(r.start, r.end), highlighted: true });
    cursor = r.end;
  }
  if (cursor < length) {
    segments.push({ text: transcript.slice(cursor), highlighted: false });
  }

  return segments.length > 0 ? segments : [{ text: transcript, highlighted: false }];
}

@Component({
  selector: 'app-assessment-detail-page',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './assessment-detail-page.html',
  styleUrl: './assessment-detail-page.css',
})
export class AssessmentDetailPageComponent implements OnInit {
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  private sessionId = 0;

  readonly state = signal<PageState>('loading');
  readonly calculating = signal(false);
  readonly assessment = signal<Assessment | null>(null);
  readonly answers = signal<InterviewAnswer[]>([]);
  readonly evidencesByCriterion = signal<Map<number, Evidence[]>>(new Map());

  private readonly severityLabels: Record<IntegritySeverity, string> = {
    LOW: 'Severidad baja',
    MEDIUM: 'Severidad media',
    HIGH: 'Severidad alta',
  };

  /** Un bloque por criterio, con sus respuestas ya divididas en fragmentos. */
  readonly criterionViews = computed<CriterionView[]>(() => {
    const assessment = this.assessment();
    if (!assessment) return [];

    const answersById = new Map(this.answers().map((a) => [a.id, a] as const));
    const evidenceMap = this.evidencesByCriterion();

    return assessment.criterionScores.map((cs) => {
      const evidences = evidenceMap.get(cs.id) ?? [];

      const byAnswer = new Map<number, Evidence[]>();
      for (const ev of evidences) {
        byAnswer.set(ev.answerId, [...(byAnswer.get(ev.answerId) ?? []), ev]);
      }

      const answerViews: EvidenceAnswerView[] = [];
      for (const [answerId, evs] of byAnswer) {
        const answer = answersById.get(answerId);
        if (!answer) continue;
        answerViews.push({
          answerId,
          label: answer.followUp
            ? `Repregunta (respuesta #${answerId})`
            : `Respuesta #${answerId}`,
          segments: buildSegments(answer.transcript, evs),
        });
      }

      return {
        id: cs.id,
        name: cs.criterionName,
        weight: cs.weight,
        score: cs.score,
        evidenceCount: evidences.length,
        answers: answerViews,
      };
    });
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (!Number.isInteger(id) || id <= 0) {
      this.state.set('error');
      return;
    }
    this.sessionId = id;
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.assessmentService.getAssessment(this.sessionId).subscribe({
      next: (assessment) => this.loadDetails(assessment),
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.state.set('missing'); // todavía no hay evaluación
        } else {
          this.state.set('error');
          this.showError(err);
        }
      },
    });
  }

  calculate(): void {
    this.calculating.set(true);
    this.assessmentService.calculateAssessment(this.sessionId).subscribe({
      next: () => {
        this.calculating.set(false);
        this.load();
      },
      error: (err: unknown) => {
        this.calculating.set(false);
        this.showError(err);
      },
    });
  }

  severityLabel(severity: IntegritySeverity): string {
    return this.severityLabels[severity] ?? severity;
  }

  private loadDetails(assessment: Assessment): void {
    const calls: Observable<EvidenceEntry>[] = assessment.criterionScores.map((cs) =>
      this.assessmentService
        .getEvidences(assessment.id, cs.id)
        .pipe(map((evidences) => [cs.id, evidences] as const))
    );

    const evidences$: Observable<EvidenceEntry[]> =
      calls.length > 0 ? forkJoin(calls) : of([]);

    forkJoin({
      answers: this.assessmentService.getAnswers(this.sessionId),
      evidences: evidences$,
    }).subscribe({
      next: ({ answers, evidences }) => {
        this.assessment.set(assessment);
        this.answers.set(answers);
        this.evidencesByCriterion.set(new Map(evidences));
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.showError(err);
      },
    });
  }

  private showError(err: unknown): void {
    const message =
      (err as HttpErrorResponse)?.error?.message ?? 'No se pudo cargar la información.';
    this.snackBar.open(message, 'Cerrar', { duration: 5000 });
  }
}
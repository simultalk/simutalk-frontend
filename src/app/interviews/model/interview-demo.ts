import { InterviewSession } from './interview-session';
import { Question } from './question';

/**
 * DATOS DE PRUEBA de la maqueta de la US-08, con la misma forma que las respuestas del backend.
 * En la conexión con el API (jueves 29) se reemplazan por:
 *   - GET /applications/{applicationId}/interview-session   -> session
 *   - GET /job-postings/{jobPostingId}                      -> jobPostingTitle (campo title)
 *   - GET /job-postings/{jobPostingId}/questions            -> questions
 */
export interface InterviewDemo {
  jobPostingTitle: string;
  session: InterviewSession;
  questions: Question[];
}

const question = (
  id: number,
  criterionId: number,
  position: number,
  statement: string,
  maxDurationSeconds: number,
  allowsFollowUp = false,
): Question => ({
  id,
  jobPostingId: 1,
  criterionId,
  statement,
  maxDurationSeconds,
  position,
  origin: 'MANUAL',
  allowsFollowUp,
  createdAt: '2026-10-20T15:00:00Z',
  updatedAt: '2026-10-20T15:00:00Z',
});

export const INTERVIEW_DEMO: InterviewDemo = {
  jobPostingTitle: 'Analista de Datos Junior',
  session: {
    id: 1,
    applicationId: 1,
    jobPostingId: 1,
    candidateId: 1,
    status: 'PENDING',
    invitedAt: '2026-10-23T14:00:00Z',
    startedAt: null,
    finishedAt: null,
    expiresAt: '2026-11-05',
    totalDurationSeconds: 0,
    answeredQuestions: 0,
    createdAt: '2026-10-23T14:00:00Z',
    updatedAt: '2026-10-23T14:00:00Z',
  },
  questions: [
    question(1, 1, 1, 'Un cliente reporta que sus ventas mensuales cayeron 15 % respecto al mes anterior. ¿Cómo usarías los datos disponibles para encontrar la causa?', 240, true),
    question(2, 1, 2, 'Recibes una tabla de pedidos con clientes duplicados, montos vacíos y fechas en formatos distintos. ¿Qué pasos seguirías para limpiarla antes de analizarla?', 180),
    question(3, 1, 3, 'Explica la diferencia entre un LEFT JOIN y un INNER JOIN y cuándo usarías cada uno al cruzar la tabla de clientes con la de pedidos.', 150),
    question(4, 1, 4, '¿Cómo detectarías y qué harías con valores atípicos en los montos de facturación?', 150),
    question(5, 2, 5, '¿Cómo le presentarías un hallazgo negativo a un gerente comercial que no tiene formación técnica?', 180),
    question(6, 2, 6, 'Un cliente cuestiona las cifras de tu reporte en una reunión. ¿Cómo le explicas de dónde salen los números?', 180),
  ],
};

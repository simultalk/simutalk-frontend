/**
 * GET /interview-sessions/{sessionId}/communication-analysis
 * Análisis de comunicación con reglas fijas (sin IA): no cambia el puntaje.
 */
export type AnswerLength = 'SHORT' | 'ADEQUATE' | 'LONG';

export interface FillerWordCount {
  word: string;
  count: number;
}

export interface AnswerCommunication {
  answerId: number;
  questionId: number;
  followUp: boolean;
  words: number;
  durationSeconds: number;
  wordsPerMinute: number | null;
  length: AnswerLength;
  fillerWordCount: number;
  /** Frase literal donde dio un ejemplo concreto (null si no hay). */
  concreteExampleEvidence: string | null;
  /** Frase literal donde mencionó un resultado (null si no hay). */
  resultEvidence: string | null;
}

export interface CommunicationAnalysis {
  interviewSessionId: number;
  answerCount: number;
  totalWords: number;
  totalSeconds: number;
  wordsPerMinute: number | null;
  fillerWordCount: number;
  fillerWordsPer100Words: number;
  fillerWords: FillerWordCount[];
  answersWithConcreteExample: number;
  answersWithResult: number;
  answers: AnswerCommunication[];
}

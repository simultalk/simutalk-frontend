import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { InterviewSession, InterviewSessionStatus } from '../../../models/interview-session';
import { Answer, Question } from '../../../models/question';
import { InterviewSessionService } from '../../../services/interview-session';
import { RecruitmentService } from '../../../services/recruitment.service';
import { SpeechDictationService } from '../../../services/speech-dictation';
import { TakeInterview, formatSeconds, isPastDue, regularAnswerIds } from './take-interview';

const question = (id: number, position: number, maxDurationSeconds = 120): Question => ({
  id,
  jobPostingId: 10,
  criterionId: 1,
  statement: `Pregunta número ${id}`,
  maxDurationSeconds,
  position,
  origin: 'MANUAL',
  allowsFollowUp: false,
  createdAt: '',
  updatedAt: '',
});

const answer = (id: number, questionId: number, followUp = false): Answer => ({
  id,
  questionId,
  parentAnswerId: followUp ? 999 : null,
  transcript: 'x',
  audioUrl: null,
  durationSeconds: 30,
  answeredAt: '',
  followUp,
});

const session = (status: InterviewSessionStatus, expiresAt = '2099-12-31'): InterviewSession => ({
  id: 900,
  applicationId: 50,
  jobPostingId: 10,
  candidateId: 7,
  status,
  invitedAt: '',
  startedAt: null,
  finishedAt: null,
  expiresAt,
  totalDurationSeconds: 0,
  answeredQuestions: 0,
  createdAt: '',
  updatedAt: '',
});

describe('TakeInterview (US-08)', () => {
  let api: {
    getByApplication: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    getQuestions: ReturnType<typeof vi.fn>;
    getAnswers: ReturnType<typeof vi.fn>;
    recordAnswer: ReturnType<typeof vi.fn>;
  };
  let dictation: { supported: ReturnType<typeof signal<boolean>>; listening: ReturnType<typeof signal<boolean>>; error: ReturnType<typeof signal<string>>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  // Desordenadas a propósito: la pantalla debe seguir el orden de position.
  const script = [question(3, 2, 180), question(2, 1, 240), question(4, 3)];

  function create(applicationId = '50') {
    TestBed.configureTestingModule({
      imports: [TakeInterview],
      providers: [
        { provide: InterviewSessionService, useValue: api },
        { provide: RecruitmentService, useValue: { getJobPostingById: () => of({ title: 'Analista de Datos Junior' }) } },
        { provide: SpeechDictationService, useValue: dictation },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ applicationId }) } } },
      ],
    });
    const fixture = TestBed.createComponent(TakeInterview);
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      render: () => fixture.detectChanges(),
      text: () => (fixture.nativeElement as HTMLElement).textContent ?? '',
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      getByApplication: vi.fn().mockReturnValue(of(session('PENDING'))),
      start: vi.fn().mockReturnValue(of(session('IN_PROGRESS'))),
      getQuestions: vi.fn().mockReturnValue(of(script)),
      getAnswers: vi.fn().mockReturnValue(of([])),
      recordAnswer: vi.fn((_: number, body: { questionId: number }): Observable<Answer> =>
        of(answer(100 + body.questionId, body.questionId))),
    };
    dictation = { supported: signal(true), listening: signal(false), error: signal(''), start: vi.fn(), stop: vi.fn() };
  });

  afterEach(() => vi.useRealTimers());

  it('carga la sesión de la postulación y muestra la vacante y la fecha límite', () => {
    const { page, text } = create();

    expect(api.getByApplication).toHaveBeenCalledWith(50);
    expect(page.step()).toBe('intro');
    expect(text()).toContain('Analista de Datos Junior');
    expect(text()).toContain('31/12/2099');
    expect(api.getQuestions).not.toHaveBeenCalled();
  });

  it('Empezar inicia la sesión y recién entonces carga el guion en orden', () => {
    const { page, render, text } = create();

    page.start();
    render();

    expect(api.start).toHaveBeenCalledWith(900);
    expect(api.getQuestions).toHaveBeenCalledWith(10);
    expect(page.questions().map((q) => q.id)).toEqual([2, 3, 4]);
    expect(text()).toContain('Pregunta 1 de 3');
    expect(text()).toContain('Pregunta número 2');
    expect(page.timeLabel()).toBe('4:00');
  });

  it('envía la respuesta al backend, guarda su id y pasa a la siguiente pregunta', () => {
    const { page, render, text } = create();
    page.start();
    vi.advanceTimersByTime(95_000);
    page.answer.setValue('  Revisaría la caída por región.  ');

    page.submit();
    render();

    expect(api.recordAnswer).toHaveBeenCalledWith(900, {
      questionId: 2,
      transcript: 'Revisaría la caída por región.',
      durationSeconds: 95,
      followUp: false,
    });
    expect(page.answerIds()).toEqual({ 2: 102 });
    expect(text()).toContain('Pregunta 2 de 3');
    expect(page.answer.value).toBe('');
    expect(page.progress()).toBeCloseTo(100 / 3);
  });

  it('tras la última respuesta muestra que todo quedó guardado', () => {
    const { page, render, text } = create();
    page.start();
    for (let i = 0; i < 3; i++) {
      page.answer.setValue(`Respuesta ${i + 1}`);
      page.submit();
    }
    render();

    expect(page.step()).toBe('answered');
    expect(page.answerIds()).toEqual({ 2: 102, 3: 103, 4: 104 });
    expect(text()).toContain('Tus 3 respuestas ya quedaron guardadas');
  });

  it('si la entrevista ya estaba en curso, sigue desde la primera pregunta sin responder', () => {
    api.getByApplication.mockReturnValue(of(session('IN_PROGRESS')));
    api.getAnswers.mockReturnValue(of([answer(102, 2), answer(150, 2, true)]));

    const { page, render, text } = create();
    render();

    expect(api.start).not.toHaveBeenCalled();
    expect(page.answerIds()).toEqual({ 2: 102 });
    expect(text()).toContain('Pregunta 2 de 3');
    expect(text()).toContain('Pregunta número 3');
  });

  it('no envía una respuesta vacía', () => {
    const { page, render, text } = create();
    page.start();
    page.answer.setValue('   ');

    page.submit();
    render();

    expect(api.recordAnswer).not.toHaveBeenCalled();
    expect(text()).toContain('Responde la pregunta antes de enviar');
  });

  it('si el envío falla, conserva lo escrito y explica qué pasó', () => {
    api.recordAnswer.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const { page, render, text } = create();
    page.start();
    page.answer.setValue('Mi respuesta');

    page.submit();
    render();

    expect(page.answer.value).toBe('Mi respuesta');
    expect(page.sending()).toBe(false);
    expect(text()).toContain('revisa tu conexión');
    expect(text()).toContain('Pregunta 1 de 3');
  });

  it('una respuesta ya guardada se trata como avance y se recarga el estado real', () => {
    api.recordAnswer.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'Question 2 has already been answered' } })),
    );
    const { page } = create();
    page.start();
    api.getAnswers.mockReturnValue(of([answer(102, 2)]));
    page.answer.setValue('Repetida');

    page.submit();

    expect(page.answerIds()).toEqual({ 2: 102 });
    expect(page.current()?.id).toBe(3);
  });

  it.each([
    [404, 'Todavía no tienes una invitación'],
    [403, 'pertenece a otro postulante'],
  ])('si no puede abrir la sesión (%i) lo explica', (status, expected) => {
    api.getByApplication.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));

    const { page, text } = create();

    expect(page.step()).toBe('unavailable');
    expect(text()).toContain(expected);
  });

  it('muestra los estados finales sin pedir el guion', () => {
    api.getByApplication.mockReturnValue(of(session('COMPLETED')));
    expect(create().text()).toContain('Ya enviaste esta entrevista');
    TestBed.resetTestingModule();

    api.getByApplication.mockReturnValue(of(session('PENDING', '2020-01-01')));
    const vencida = create();
    expect(vencida.page.step()).toBe('expired');
    expect(api.getQuestions).not.toHaveBeenCalled();
  });

  it('el temporizador avisa cuando se acaba el tiempo y detiene el dictado', () => {
    const { page, render, text } = create();
    page.start();

    vi.advanceTimersByTime(240_000);
    render();

    expect(page.timeUp()).toBe(true);
    expect(text()).toContain('Se acabó el tiempo');
    expect(dictation.stop).toHaveBeenCalled();
  });
});

describe('funciones de apoyo', () => {
  it.each([
    [0, '0:00'],
    [185, '3:05'],
    [600, '10:00'],
  ])('formatSeconds(%i) = %s', (seconds, expected) => {
    expect(formatSeconds(seconds)).toBe(expected);
  });

  it('la fecha límite vale hasta el final de ese día', () => {
    expect(isPastDue('2026-11-05', new Date(2026, 10, 5, 23, 59))).toBe(false);
    expect(isPastDue('2026-11-05', new Date(2026, 10, 6, 0, 1))).toBe(true);
  });

  it('las repreguntas no cuentan como pregunta respondida', () => {
    expect(regularAnswerIds([answer(1, 10), answer(2, 10, true), answer(3, 11)])).toEqual({ 10: 1, 11: 3 });
  });
});

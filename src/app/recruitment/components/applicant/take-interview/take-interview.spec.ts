import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { INTERVIEW_DEMO } from '../../../models/interview-demo';
import { SpeechDictationService } from '../../../services/speech-dictation';
import { TakeInterview, formatSeconds } from './take-interview';

describe('TakeInterview (maqueta US-08)', () => {
  let page: TakeInterview;
  let text: () => string;
  let render: () => void;
  let dictation: { supported: ReturnType<typeof signal<boolean>>; listening: ReturnType<typeof signal<boolean>>; error: ReturnType<typeof signal<string>>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    dictation = {
      supported: signal(true),
      listening: signal(false),
      error: signal(''),
      start: vi.fn(),
      stop: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [TakeInterview],
      providers: [{ provide: SpeechDictationService, useValue: dictation }],
    });
    const fixture = TestBed.createComponent(TakeInterview);
    page = fixture.componentInstance;
    render = () => fixture.detectChanges();
    text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    render();
  });

  afterEach(() => vi.useRealTimers());

  it('empieza con las instrucciones y el nombre de la vacante', () => {
    expect(page.step()).toBe('intro');
    expect(text()).toContain('Analista de Datos Junior');
    expect(text()).toContain('6 preguntas');
  });

  it('al empezar muestra la primera pregunta, el progreso y el tiempo máximo', () => {
    page.start();
    render();

    expect(text()).toContain('Pregunta 1 de 6');
    expect(text()).toContain(INTERVIEW_DEMO.questions[0].statement);
    expect(page.timeLabel()).toBe('4:00');
  });

  it('el temporizador cuenta hacia atrás y avisa cuando se acaba el tiempo', () => {
    page.start();

    vi.advanceTimersByTime(210_000);
    expect(page.timeLabel()).toBe('0:30');
    expect(page.warning()).toBe(true);
    expect(page.timeUp()).toBe(false);

    vi.advanceTimersByTime(40_000);
    render();
    expect(page.remainingSeconds()).toBe(0);
    expect(page.timeUp()).toBe(true);
    expect(text()).toContain('Se acabó el tiempo');
    expect(dictation.stop).toHaveBeenCalled();
  });

  it('el campo no se marca como error solo por tocarlo y salir', () => {
    page.start();
    page.answer.markAsTouched();
    render();

    expect(page.answer.invalid).toBe(false);
    expect(text()).not.toContain('Responde la pregunta antes de enviar');
  });

  it('no envía una respuesta vacía y solo entonces muestra el aviso', () => {
    page.start();
    render();
    expect(text()).not.toContain('Responde la pregunta antes de enviar');

    page.answer.setValue('   ');
    page.submit();
    render();

    expect(page.answers()).toEqual([]);
    expect(page.number()).toBe(1);
    expect(text()).toContain('Responde la pregunta antes de enviar');
  });

  it('al enviar guarda la respuesta con su duración y pasa a la siguiente pregunta', () => {
    page.start();
    vi.advanceTimersByTime(95_000);
    page.answer.setValue('  Revisaría la caída por región y canal.  ');

    page.submit();
    render();

    expect(page.answers()).toEqual([
      { questionId: 1, transcript: 'Revisaría la caída por región y canal.', durationSeconds: 95, followUp: false },
    ]);
    expect(text()).toContain('Pregunta 2 de 6');
    expect(page.answer.value).toBe('');
    expect(page.timeLabel()).toBe('3:00');
    expect(page.progress()).toBeCloseTo(100 / 6);
  });

  it('tras la última pregunta muestra el cierre', () => {
    page.start();
    for (let i = 0; i < 6; i++) {
      page.answer.setValue(`Respuesta ${i + 1}`);
      page.submit();
    }
    render();

    expect(page.step()).toBe('finished');
    expect(page.answers()).toHaveLength(6);
    expect(text()).toContain('Registramos tus 6 respuestas');
  });

  it('lo dictado se agrega a lo que ya estaba escrito', () => {
    page.start();
    page.answer.setValue('Primero');

    page.toggleDictation();
    const onText = dictation.start.mock.calls[0][0] as (text: string) => void;
    onText('perfilaría la tabla');

    expect(page.answer.value).toBe('Primero perfilaría la tabla');
  });

  it('sin soporte de voz no muestra el botón de dictado', () => {
    dictation.supported.set(false);
    page.start();
    render();

    expect(text()).not.toContain('Dictar respuesta');
  });
});

describe('formatSeconds', () => {
  it.each([
    [0, '0:00'],
    [59, '0:59'],
    [185, '3:05'],
    [600, '10:00'],
  ])('%i segundos -> %s', (seconds, expected) => {
    expect(formatSeconds(seconds)).toBe(expected);
  });
});

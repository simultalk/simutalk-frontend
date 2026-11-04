import { TestBed } from '@angular/core/testing';
import { SpeechDictationService, dictationErrorMessage } from './speech-dictation';

class FakeRecognition {
  static last: FakeRecognition;
  lang = '';
  continuous = false;
  interimResults = true;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
}

describe('SpeechDictationService', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'];
    TestBed.resetTestingModule();
  });

  it('sin reconocimiento de voz en el navegador no está disponible', () => {
    const service = TestBed.inject(SpeechDictationService);

    expect(service.supported()).toBe(false);
    service.start(vi.fn());
    expect(service.listening()).toBe(false);
  });

  it('escucha en español y entrega solo las frases finales', () => {
    (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] = FakeRecognition;
    const service = TestBed.inject(SpeechDictationService);
    const onText = vi.fn();

    service.start(onText);
    const recognition = FakeRecognition.last;
    recognition.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: ' contaría los duplicados ' } },
        { isFinal: false, 0: { transcript: 'y las fe' } },
      ],
    });

    expect(service.supported()).toBe(true);
    expect(recognition.lang).toBe('es-PE');
    expect(service.listening()).toBe(true);
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledWith('contaría los duplicados');
  });

  it('si el micrófono está bloqueado lo explica', () => {
    (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] = FakeRecognition;
    const service = TestBed.inject(SpeechDictationService);

    service.start(vi.fn());
    FakeRecognition.last.onerror?.({ error: 'not-allowed' });

    expect(service.error()).toContain('Permite el uso del micrófono');
    expect(service.listening()).toBe(false);
  });

  it('si el navegador no puede arrancar el dictado no se queda escuchando', () => {
    (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] = class extends FakeRecognition {
      override start = vi.fn(() => {
        throw new Error('InvalidStateError');
      });
    };
    const service = TestBed.inject(SpeechDictationService);

    service.start(vi.fn());

    expect(service.listening()).toBe(false);
    expect(service.error()).toBe('No se pudo usar el dictado. Puedes escribir tu respuesta.');
  });

  it.each([
    ['audio-capture', 'No encontramos un micrófono'],
    ['no-speech', 'No te escuchamos'],
    ['network', 'solo funciona en Google Chrome o Microsoft Edge'],
  ])('explica el error %s', (error, expected) => {
    expect(dictationErrorMessage(error)).toContain(expected);
  });
});

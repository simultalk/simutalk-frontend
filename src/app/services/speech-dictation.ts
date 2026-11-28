import { Injectable, NgZone, inject, signal } from '@angular/core';

/** Lo mínimo de la Web Speech API que usamos (no viene tipada en TypeScript). */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/**
 * Dictado por voz con el reconocimiento del navegador (Chrome y Edge). Convierte la voz del
 * postulante en texto, que es lo que guarda el backend (transcript). En navegadores sin soporte,
 * supported() es false y el postulante escribe su respuesta.
 */
@Injectable({ providedIn: 'root' })
export class SpeechDictationService {
  private readonly zone = inject(NgZone);
  private readonly Recognition: SpeechRecognitionConstructor | undefined =
    typeof window === 'undefined'
      ? undefined
      : ((window as unknown as Record<string, SpeechRecognitionConstructor | undefined>)['SpeechRecognition'] ??
        (window as unknown as Record<string, SpeechRecognitionConstructor | undefined>)['webkitSpeechRecognition']);

  private recognition: SpeechRecognitionLike | null = null;

  readonly supported = signal(this.Recognition !== undefined);
  readonly listening = signal(false);
  readonly error = signal('');

  /**
   * Empieza a escuchar; cada frase reconocida se entrega a onText.
   * @param lang idioma de la app (es-419, en-US): se dicta en ese idioma.
   */
  start(onText: (text: string) => void, lang: string | null = 'es-419'): void {
    if (!this.Recognition || this.listening()) {
      return;
    }
    const recognition = new this.Recognition();
    recognition.lang = lang?.startsWith('en') ? 'en-US' : 'es-PE';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) =>
      this.zone.run(() => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            onText(event.results[i][0].transcript.trim());
          }
        }
      });
    recognition.onerror = (event) =>
      this.zone.run(() => {
        this.error.set(dictationErrorMessage(event.error));
        this.listening.set(false);
      });
    recognition.onend = () => this.zone.run(() => this.listening.set(false));
    this.error.set('');
    this.recognition = recognition;
    try {
      recognition.start();
      this.listening.set(true);
    } catch {
      this.recognition = null;
      this.error.set(dictationErrorMessage(''));
    }
  }

  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
    this.listening.set(false);
  }
}

/** Clave de traducción (interviews.dictation.*) que explica por qué no funcionó el dictado. */
export function dictationErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'interviews.dictation.notAllowed';
    case 'audio-capture':
      return 'interviews.dictation.noMicrophone';
    case 'no-speech':
      return 'interviews.dictation.noSpeech';
    case 'network':
      return 'interviews.dictation.network';
    default:
      return 'interviews.dictation.generic';
  }
}

import { Injectable, signal } from '@angular/core';

/**
 * Lee en voz alta las preguntas de la entrevista con la voz del navegador (Web Speech API).
 * No usa servicios externos ni claves. Si el navegador no lo soporta, simplemente no se muestra.
 */
@Injectable({ providedIn: 'root' })
export class SpeechReaderService {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  readonly speaking = signal(false);

  speak(text: string): void {
    if (!this.supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Las preguntas las escribe la empresa: se elige la voz según el idioma del texto, no el de la app
    utterance.lang = looksSpanish(text) ? 'es-419' : 'en-US';
    utterance.rate = 0.95;
    utterance.onstart = () => this.speaking.set(true);
    utterance.onend = () => this.speaking.set(false);
    utterance.onerror = () => this.speaking.set(false);
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    this.speaking.set(false);
  }
}

/** Detección simple: tildes, ñ, signos de apertura o palabras muy comunes del español. */
export function looksSpanish(text: string): boolean {
  return /[áéíóúñ¿¡]|\b(el|la|los|las|de|que|y|en|por|para|con|una?|cómo|qué)\b/i.test(text);
}

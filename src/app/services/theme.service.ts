import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

const THEME_KEY = 'simutalk.theme';

/** Modo claro u oscuro. Pone o quita la clase "dark" en <html> y lo recuerda en el navegador. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);

  readonly dark = signal(false);

  /** Al arrancar: el modo guardado o, si no hay, el del sistema operativo. */
  init(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      saved = null;
    }
    const systemDark = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    this.apply(saved ? saved === 'dark' : systemDark);
  }

  toggle(dark: boolean): void {
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // sin almacenamiento disponible: solo cambia en esta visita
    }
    this.apply(dark);
  }

  private apply(dark: boolean): void {
    this.dark.set(dark);
    this.document.documentElement.classList.toggle('dark', dark);
  }
}

import { DOCUMENT, Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export interface Language {
  code: string;
  label: string;
}

const LANG_KEY = 'simutalk.lang';
export const DEFAULT_LANG = 'es-419';

/** Idiomas disponibles (T-04). Para agregar uno: nuevo archivo en public/assets/i18n y una línea aquí. */
export const LANGUAGES: Language[] = [
  { code: 'es-419', label: 'Español' },
  { code: 'en-US', label: 'English' },
];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private document = inject(DOCUMENT);

  readonly languages = LANGUAGES;

  /** Idioma con el que arranca la app: el guardado o, si no hay, español. */
  init(): Observable<unknown> {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {
      saved = null;
    }
    const lang = LANGUAGES.some(l => l.code === saved) ? saved! : DEFAULT_LANG;
    return this.apply(lang);
  }

  /** Cambia el idioma y lo recuerda para la próxima visita. */
  use(lang: string): void {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // sin almacenamiento disponible: solo cambia en esta visita
    }
    this.apply(lang).subscribe();
  }

  current(): string {
    return this.translate.getCurrentLang() ?? DEFAULT_LANG;
  }

  private apply(lang: string): Observable<unknown> {
    this.document.documentElement.lang = lang;
    return this.translate.use(lang);
  }
}

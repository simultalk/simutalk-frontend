import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** "hace 5 minutos", "ayer", "hace 3 días"… en el idioma actual. */
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(iso: string | null | undefined): string {
    if (!iso) return '';
    const lang = this.translate.getCurrentLang() ?? 'es-419';
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const abs = Math.abs(seconds);
    if (abs < 45) return rtf.format(0, 'second');
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
    if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
    if (abs < 604_800) return rtf.format(Math.round(seconds / 86_400), 'day');
    return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  }
}

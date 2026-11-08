import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

/** Reloj del menú lateral: esfera analógica + hora digital + fecha, en el idioma elegido. */
@Component({
  selector: 'app-clock',
  imports: [TranslatePipe],
  templateUrl: './clock.html',
  styleUrl: './clock.css',
})
export class Clock implements OnInit, OnDestroy {
  private translate = inject(TranslateService);
  private timer: ReturnType<typeof setInterval> | undefined;

  readonly now = signal(new Date());

  /** Idioma actual: la hora y la fecha se formatean con él. */
  private readonly lang = toSignal(
    this.translate.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translate.getCurrentLang() ?? 'es-419'),
    ),
    { initialValue: 'es-419' },
  );

  /** Ciudad de la zona horaria del navegador, p. ej. "Lima". */
  readonly city = (Intl.DateTimeFormat().resolvedOptions().timeZone ?? '').split('/').pop()?.replace(/_/g, ' ') ?? '';

  readonly time = computed(() =>
    this.now().toLocaleTimeString(this.lang(), { hour: '2-digit', minute: '2-digit', hour12: false }),
  );

  readonly seconds = computed(() => String(this.now().getSeconds()).padStart(2, '0'));

  /** "Domingo, 8 nov." con la primera letra en mayúscula. */
  readonly date = computed(() => {
    const text = this.now().toLocaleDateString(this.lang(), { weekday: 'long', day: 'numeric', month: 'short' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  });

  /** Saludo según la hora del día. */
  readonly greetingKey = computed(() => {
    const h = this.now().getHours();
    if (h < 12) return 'shared.clock.morning';
    if (h < 19) return 'shared.clock.afternoon';
    return 'shared.clock.evening';
  });

  // Ángulos de las agujas (grados)
  readonly hourAngle = computed(() => {
    const d = this.now();
    return (d.getHours() % 12) * 30 + d.getMinutes() * 0.5;
  });
  readonly minuteAngle = computed(() => {
    const d = this.now();
    return d.getMinutes() * 6 + d.getSeconds() * 0.1;
  });
  readonly secondAngle = computed(() => this.now().getSeconds() * 6);

  /** Las 12 marcas de la esfera. */
  readonly ticks = Array.from({ length: 12 }, (_, i) => i * 30);

  ngOnInit(): void {
    this.timer = setInterval(() => this.now.set(new Date()), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}

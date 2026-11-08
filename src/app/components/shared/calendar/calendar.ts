import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CalendarEvent, CalendarEventKind, CalendarService } from '../../../services/calendar.service';
import { ROLE_CANDIDATE } from '../../../models/menu';
import { CountUp } from '../count-up/count-up';

interface DayCell {
  iso: string; // yyyy-MM-dd
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  events: CalendarEvent[];
}

/** Orden en que se muestran los eventos dentro de un día (lo más urgente primero). */
const KIND_ORDER: CalendarEventKind[] = [
  'INTERVIEW_DEADLINE',
  'POSTING_CLOSING',
  'APPLICATIONS_RECEIVED',
  'INTERVIEW_DONE',
  'APPLIED',
];

/** Calendario: cierre de vacantes (ambos roles) y entrevistas (postulante). */
@Component({
  selector: 'app-calendar',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe, CountUp],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarPage implements OnInit {
  private calendar = inject(CalendarService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  readonly isCandidate = this.auth.hasAnyRole([ROLE_CANDIDATE]);

  readonly events = signal<CalendarEvent[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly todayIso = toIso(new Date());
  /** Primer día del mes que se está viendo. */
  readonly cursor = signal(firstOfMonth(new Date()));
  readonly selected = signal(this.todayIso);
  /** Dirección de la última navegación, para animar la entrada del mes. */
  readonly direction = signal<'prev' | 'next' | 'none'>('none');

  private readonly lang = toSignal(
    this.translate.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translate.getCurrentLang() ?? 'es-419'),
    ),
    { initialValue: 'es-419' },
  );

  /** Tipos que se muestran en la leyenda según el rol. */
  readonly legend = computed<CalendarEventKind[]>(() =>
    this.isCandidate
      ? ['POSTING_CLOSING', 'INTERVIEW_DEADLINE', 'INTERVIEW_DONE', 'APPLIED']
      : ['POSTING_CLOSING', 'APPLICATIONS_RECEIVED'],
  );
  readonly hidden = signal<Set<CalendarEventKind>>(new Set());

  readonly monthLabel = computed(() =>
    capitalize(this.cursor().toLocaleDateString(this.lang(), { month: 'long', year: 'numeric' })),
  );

  /** Lunes a domingo, en el idioma actual. */
  readonly weekdays = computed(() => {
    const monday = new Date(2024, 0, 1); // fue lunes
    return Array.from({ length: 7 }, (_, i) =>
      new Date(monday.getFullYear(), 0, 1 + i).toLocaleDateString(this.lang(), { weekday: 'short' }),
    );
  });

  private readonly visibleEvents = computed(() => this.events().filter((e) => !this.hidden().has(e.kind)));

  private readonly byDay = computed(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of this.visibleEvents()) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    for (const list of m.values()) list.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    return m;
  });

  /** 6 semanas x 7 días, empezando el lunes. */
  readonly cells = computed<DayCell[]>(() => {
    const first = this.cursor();
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = toIso(d);
      return {
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === first.getMonth(),
        isToday: iso === this.todayIso,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isPast: iso < this.todayIso,
        events: this.byDay().get(iso) ?? [],
      };
    });
  });

  readonly selectedEvents = computed(() => this.byDay().get(this.selected()) ?? []);

  readonly selectedLabel = computed(() =>
    capitalize(
      fromIso(this.selected()).toLocaleDateString(this.lang(), { weekday: 'long', day: 'numeric', month: 'long' }),
    ),
  );

  /** Próximos 6 eventos desde hoy (sin contar los que ya pasaron). */
  readonly upcoming = computed(() =>
    this.visibleEvents()
      .filter((e) => e.date >= this.todayIso && e.kind !== 'APPLIED' && e.kind !== 'INTERVIEW_DONE')
      .sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
      .slice(0, 6),
  );

  // Indicadores de la parte superior
  readonly closingThisWeek = computed(() => {
    const limit = toIso(addDays(new Date(), 7));
    return this.events().filter((e) => e.kind === 'POSTING_CLOSING' && e.date >= this.todayIso && e.date <= limit).length;
  });
  readonly pendingInterviews = computed(
    () => this.events().filter((e) => e.kind === 'INTERVIEW_DEADLINE' && e.date >= this.todayIso).length,
  );
  readonly receivedThisMonth = computed(() => {
    const prefix = this.todayIso.slice(0, 7);
    return this.events()
      .filter((e) => e.kind === 'APPLICATIONS_RECEIVED' && e.date.startsWith(prefix))
      .reduce((sum, e) => sum + (e.count ?? 0), 0);
  });
  readonly eventsThisMonth = computed(() => {
    const c = this.cursor();
    const prefix = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}`;
    return this.visibleEvents().filter((e) => e.date.startsWith(prefix)).length;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.calendar.getEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  prev(): void {
    const c = this.cursor();
    this.direction.set('prev');
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }

  next(): void {
    const c = this.cursor();
    this.direction.set('next');
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  goToday(): void {
    this.direction.set('none');
    this.cursor.set(firstOfMonth(new Date()));
    this.selected.set(this.todayIso);
  }

  select(cell: DayCell): void {
    this.selected.set(cell.iso);
    if (!cell.inMonth) {
      const d = fromIso(cell.iso);
      this.direction.set(cell.iso < toIso(this.cursor()) ? 'prev' : 'next');
      this.cursor.set(firstOfMonth(d));
    }
  }

  toggleKind(kind: CalendarEventKind): void {
    this.hidden.update((set) => {
      const next = new Set(set);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  /** Días que faltan (0 = hoy). */
  daysLeft(iso: string): number {
    return Math.round((fromIso(iso).getTime() - fromIso(this.todayIso).getTime()) / 86_400_000);
  }

  shortDate(iso: string): { day: string; month: string } {
    const d = fromIso(iso);
    return {
      day: String(d.getDate()),
      month: d.toLocaleDateString(this.lang(), { month: 'short' }).replace('.', ''),
    };
  }

  /** Texto del evento: título + detalle según el tipo. */
  eventKey(e: CalendarEvent): string {
    return `calendar.kind.${e.kind}`;
  }
}

/** Primera letra en mayúscula: "noviembre de 2026" → "Noviembre de 2026". */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../../services/notification.service';
import { AppNotification, NotificationKind } from '../../../models/notification.model';
import { TimeAgoPipe } from './time-ago.pipe';

type Filter = 'ALL' | 'UNREAD' | 'INTERVIEWS' | 'POSTINGS' | 'APPLICATIONS';

interface Group {
  key: string; // clave de traducción del grupo (Hoy, Ayer, Esta semana, Anteriores)
  items: AppNotification[];
}

const FILTER_KINDS: Record<Exclude<Filter, 'ALL' | 'UNREAD'>, NotificationKind[]> = {
  INTERVIEWS: ['INTERVIEW_INVITE', 'INTERVIEW_DEADLINE', 'CANDIDATE_ASSESSED'],
  POSTINGS: ['NEW_POSTING', 'POSTING_CLOSING'],
  APPLICATIONS: ['APPLICATION_STATUS', 'NEW_APPLICATION'],
};

/** Módulo de notificaciones: historial completo, filtros, agrupado por día y ajustes de avisos. */
@Component({
  selector: 'app-notifications',
  imports: [MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule, TranslatePipe, TimeAgoPipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsPage {
  readonly notifications = inject(NotificationService);

  readonly filters: Filter[] = ['ALL', 'UNREAD', 'INTERVIEWS', 'POSTINGS', 'APPLICATIONS'];
  readonly filter = signal<Filter>('ALL');

  readonly filtered = computed(() => {
    const f = this.filter();
    return this.notifications.items().filter((n) => {
      if (f === 'ALL') return true;
      if (f === 'UNREAD') return !n.read;
      return FILTER_KINDS[f].includes(n.kind);
    });
  });

  /** Agrupa por Hoy / Ayer / Esta semana / Anteriores. */
  readonly groups = computed<Group[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = 86_400_000;
    const buckets: Group[] = [
      { key: 'notifications.groupToday', items: [] },
      { key: 'notifications.groupYesterday', items: [] },
      { key: 'notifications.groupWeek', items: [] },
      { key: 'notifications.groupOlder', items: [] },
    ];
    for (const n of this.filtered()) {
      const t = new Date(n.createdAt).getTime();
      const index = t >= today.getTime() ? 0 : t >= today.getTime() - day ? 1 : t >= today.getTime() - 7 * day ? 2 : 3;
      buckets[index].items.push(n);
    }
    return buckets.filter((g) => g.items.length > 0);
  });

  /** Cuántas hay por filtro, para los contadores de las pestañas. */
  count(f: Filter): number {
    const items = this.notifications.items();
    if (f === 'ALL') return items.length;
    if (f === 'UNREAD') return items.filter((n) => !n.read).length;
    return items.filter((n) => FILTER_KINDS[f].includes(n.kind)).length;
  }

  togglePush(enabled: boolean): void {
    if (enabled) this.notifications.enablePush();
    else this.notifications.disablePush();
  }
}

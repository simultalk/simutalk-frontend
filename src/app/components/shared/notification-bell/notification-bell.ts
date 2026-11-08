import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../../services/notification.service';
import { AppNotification } from '../../../models/notification.model';
import { TimeAgoPipe } from '../notifications/time-ago.pipe';

/** Campana de la barra superior con el panel desplegable de notificaciones. */
@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, CdkConnectedOverlay, CdkOverlayOrigin, MatButtonModule, MatIconModule, TranslatePipe, TimeAgoPipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell {
  readonly notifications = inject(NotificationService);

  readonly open = signal(false);
  readonly onlyUnread = signal(false);

  readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 10 },
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 10 },
  ];

  /** Las 6 más recientes (o solo las no leídas). */
  readonly visible = computed(() =>
    this.notifications
      .items()
      .filter((n) => !this.onlyUnread() || !n.read)
      .slice(0, 6),
  );

  readonly badge = computed(() => {
    const count = this.notifications.unreadCount();
    return count > 9 ? '9+' : String(count);
  });

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  select(n: AppNotification): void {
    this.close();
    this.notifications.open(n);
  }
}

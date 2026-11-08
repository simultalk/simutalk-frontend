import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { Clock } from '../clock/clock';
import { NotificationBell } from '../notification-bell/notification-bell';
import { NotificationToasts } from '../notification-toasts/notification-toasts';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    LanguageSwitcher,
    ThemeToggle,
    Clock,
    NotificationBell,
    NotificationToasts,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private notifications = inject(NotificationService);

  menu = this.auth.menu();
  username = this.auth.username() ?? '';
  roleLabel = this.auth.roleLabel();
  initials = this.username
    .split(/[.\s_-]+/)
    .filter(part => part.length > 0)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');

  /** Empieza a revisar novedades para la campana y los avisos. */
  ngOnInit(): void {
    this.notifications.start();
  }

  ngOnDestroy(): void {
    this.notifications.stop();
  }

  /** "Saltar al contenido": lleva el foco del teclado al contenido principal, sin pasar por el menú. */
  saltarAlContenido(event: Event): void {
    event.preventDefault();
    document.getElementById('contenido')?.focus();
  }
}

import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../../services/notification.service';

/** Avisos emergentes dentro de la app: aparecen abajo a la derecha cuando llega algo nuevo. */
@Component({
  selector: 'app-notification-toasts',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <div class="pila" aria-live="polite">
      @for (t of notifications.toasts(); track t.id) {
        <div class="aviso" role="status">
          <button type="button" class="abrir" (click)="notifications.open(t)">
            <span class="icono" aria-hidden="true">
              <mat-icon fontSet="material-symbols-outlined">{{ notifications.icon(t.kind) }}</mat-icon>
            </span>
            <span class="texto">
              <strong>{{ t.titleKey | translate: t.params }}</strong>
              <span>{{ t.bodyKey | translate: t.params }}</span>
            </span>
          </button>
          <button
            type="button"
            class="cerrar"
            [attr.aria-label]="'notifications.dismiss' | translate"
            (click)="notifications.dismissToast(t.id)"
          >
            <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
          </button>
          <span class="tiempo" aria-hidden="true"></span>
        </div>
      }
    </div>
  `,
  styles: `
    .pila {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 1000;
      display: grid;
      gap: 10px;
      width: min(380px, calc(100vw - 32px));
      pointer-events: none;
    }

    .aviso {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      pointer-events: auto;
      color: #fff;
      border-radius: 14px;
      background: var(--st-brand-gradient);
      box-shadow: 0 18px 40px rgba(10, 58, 51, 0.35);
      animation: entrar 0.5s var(--st-ease);
    }

    @keyframes entrar {
      from { opacity: 0; transform: translateX(24px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }

    .abrir {
      flex: 1;
      display: flex;
      gap: 12px;
      padding: 14px 4px 16px 14px;
      border: none;
      text-align: left;
      font: inherit;
      color: inherit;
      background: transparent;
      cursor: pointer;
    }

    .icono {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.14);
      color: var(--st-accent);
    }

    .texto {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .texto strong { font-size: 14px; font-weight: 600; }
    .texto span { font-size: 13px; line-height: 1.4; color: rgba(255, 255, 255, 0.85); }

    .cerrar {
      margin: 8px 8px 0 0;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.8);
      background: transparent;
      cursor: pointer;
    }

    .cerrar:hover { background: rgba(255, 255, 255, 0.12); }
    .cerrar mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Barra que se va vaciando mientras el aviso sigue visible */
    .tiempo {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      width: 100%;
      background: var(--st-accent);
      transform-origin: left;
      animation: vaciar 6s linear forwards;
    }

    @keyframes vaciar { to { transform: scaleX(0); } }

    @media (max-width: 720px) {
      .pila { right: 16px; bottom: 84px; }
      .aviso:not(:first-child) { display: none; }
    }
  `,
})
export class NotificationToasts {
  readonly notifications = inject(NotificationService);
}

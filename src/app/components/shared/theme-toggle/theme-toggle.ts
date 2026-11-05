import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../services/theme.service';

/** Interruptor de modo claro / oscuro con el ícono dentro de la perilla. */
@Component({
  selector: 'app-theme-toggle',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  theme = inject(ThemeService);
}

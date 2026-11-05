import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';

/** Selector de idioma (T-04). Se usa en la barra superior y en el login. */
@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslatePipe],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  language = inject(LanguageService);
}

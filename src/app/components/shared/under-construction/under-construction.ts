import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MENU_BY_ROLE } from '../../../models/menu';

/**
 * Página temporal para las secciones del menú que todavía no tienen pantalla.
 * El título es la clave de traducción de la opción del menú con esa ruta;
 * si no está en el menú, se usa data.title de la ruta. Se reemplaza cuando el compañero suba su página.
 */
@Component({
  selector: 'app-under-construction',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './under-construction.html',
  styleUrl: './under-construction.css',
})
export class UnderConstruction {
  private url = inject(Router).url.split('?')[0];
  private menuItem = Object.values(MENU_BY_ROLE)
    .flat()
    .find(item => item.route === this.url);

  title: string =
    this.menuItem?.label ?? inject(ActivatedRoute).snapshot.data['title'] ?? 'common.home';
}

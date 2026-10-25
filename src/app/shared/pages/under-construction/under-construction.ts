import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Página temporal para las secciones del menú que todavía no tienen pantalla.
 * El título sale de data.title de la ruta. Se reemplaza cuando el compañero suba su página.
 */
@Component({
  selector: 'app-under-construction',
  imports: [MatIconModule],
  templateUrl: './under-construction.html',
  styleUrl: './under-construction.css',
})
export class UnderConstruction {
  title: string = inject(ActivatedRoute).snapshot.data['title'] ?? 'Sección';
}

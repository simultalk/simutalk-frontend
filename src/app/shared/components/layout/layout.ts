import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, MatToolbarModule, MatSidenavModule, MatListModule, MatButtonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  auth = inject(AuthService);
}

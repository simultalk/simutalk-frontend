import { Routes } from '@angular/router';
import { InvitationTest } from './pages/invitation-test/invitation-test';

/** Rutas del contexto interviews, montadas bajo /interviews. */
export const interviewsRoutes: Routes = [
  // TEMPORAL (US-07): se elimina cuando el diálogo se abra desde el pipeline (Sprint 4).
  { path: 'invitation-test', component: InvitationTest },
];

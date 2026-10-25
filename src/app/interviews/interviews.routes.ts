import { Routes } from '@angular/router';
import { InvitationTest } from './pages/invitation-test/invitation-test';
import { TakeInterview } from './pages/take-interview/take-interview';

/** Rutas del contexto interviews, montadas bajo /interviews. */
export const interviewsRoutes: Routes = [
  // TEMPORAL (US-07): se elimina cuando el diálogo se abra desde el pipeline (Sprint 4).
  { path: 'invitation-test', component: InvitationTest },
  // US-08, maqueta con datos de prueba. Al conectar el API recibirá el applicationId.
  { path: 'take-interview', component: TakeInterview },
];

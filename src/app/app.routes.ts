import { Routes, Route } from '@angular/router';
import { inject } from '@angular/core';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';
import { CompanyRegister } from './iam/pages/company-register/company-register';
import { ApplicantRegister } from './iam/pages/applicant-register/applicant-register';
import { authGuard } from './shared/guards/auth.guard';
import { roleGuard } from './shared/guards/role.guard';
import { AuthService } from './shared/services/auth.service';
import { Forbidden } from './shared/pages/forbidden/forbidden';
import { UnderConstruction } from './shared/pages/under-construction/under-construction';
import { ROLE_CANDIDATE, ROLE_RECRUITER } from './shared/model/menu';

/** Sección del menú que todavía no tiene pantalla: muestra "En construcción". */
function pending(path: string, title: string, roles: string[]): Route {
  return { path, component: UnderConstruction, data: { title, roles } };
}

export const routes: Routes = [
  // Páginas públicas (sin menú)
  { path: 'login', component: Login },
  { path: 'register/company', component: CompanyRegister },
  { path: 'register/applicant', component: ApplicantRegister },

  // Páginas internas: piden sesión (authGuard) y el rol de data.roles (roleGuard)
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      // Inicio: cada rol va a su página principal
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).homeUrl() },

      // Reclutador
      pending('recruitment/my-job-postings', 'Mis vacantes', [ROLE_RECRUITER]),
      {
        path: 'assessment/ranking',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./assessment/pages/ranking-page/ranking-page').then(
            (m) => m.RankingPageComponent
          ),
      },
      pending('analytics/reports', 'Reportes', [ROLE_RECRUITER]),

      // Postulante
      {
  path: 'recruitment/job-postings',
  data: { roles: [ROLE_CANDIDATE] },
  loadComponent: () => import('./recruitment/pages/list-job-postings/list-job-postings.component')
    .then(m => m.ListJobPostingsComponent),
},
{
  path: 'recruitment/job-postings/:id',
  data: { roles: [ROLE_CANDIDATE] },
  loadComponent: () => import('./recruitment/pages/detail-job-posting/detail-job-posting.component')
    .then(m => m.DetailJobPostingComponent),
  },
      pending('recruitment/my-applications', 'Mis postulaciones', [ROLE_CANDIDATE]),
      pending('profiles/me', 'Mi perfil', [ROLE_CANDIDATE]),
      pending('profiles/certifications', 'Certificaciones', [ROLE_CANDIDATE]),

      // 403
      { path: 'forbidden', component: Forbidden },
    ],
  },

  // Cualquier otra dirección vuelve al inicio. Siempre debe ir al final.
  { path: '**', redirectTo: '' }
];

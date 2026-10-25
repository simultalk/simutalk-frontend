import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';
import { CompanyRegister } from './iam/pages/company-register/company-register';
import { ApplicantRegister } from './iam/pages/applicant-register/applicant-register';

export const routes: Routes = [
  // Páginas públicas (sin menú)
  { path: 'login', component: Login },
  { path: 'register/company', component: CompanyRegister },
  { path: 'register/applicant', component: ApplicantRegister },

  // Páginas internas: se muestran dentro del layout (barra superior + menú)
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'assessment/ranking',
        loadComponent: () =>
          import('./assessment/pages/ranking-page/ranking-page').then(
            (m) => m.RankingPageComponent
          ),
      },
    ],
  },

  // Cualquier otra dirección vuelve al inicio. Siempre debe ir al final.
  { path: '**', redirectTo: '' }
];
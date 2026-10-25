import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Layout, children: [] },
  { path: '**', redirectTo: '' },
  {
    path: 'assessment/ranking',
    // canActivate: [authGuard, roleGuard], data: { roles: ['ROLE_RECRUITER'] },
    loadComponent: () =>
      import('./assessment/pages/ranking-page/ranking-page').then(
        (m) => m.RankingPageComponent
      ),
  },
];
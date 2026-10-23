import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';
import { interviewsRoutes } from './interviews/interviews.routes';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Layout, children: [{ path: 'interviews', children: interviewsRoutes }] },
  { path: '**', redirectTo: '' }
];

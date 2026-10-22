import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Layout, children: [] },
  { path: '**', redirectTo: '' }
];

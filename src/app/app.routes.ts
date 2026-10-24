import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';
import { CompanyRegister } from './iam/pages/company-register/company-register';
import { ApplicantRegister } from './iam/pages/applicant-register/applicant-register';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register/company', component: CompanyRegister },
  { path: 'register/applicant', component: ApplicantRegister },
  { path: '', component: Layout, children: [] },
  { path: '**', redirectTo: '' }
];

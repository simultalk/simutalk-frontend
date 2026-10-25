import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './iam/pages/login/login';
import { ListJobPostingsComponent } from './recruitment/pages/list-job-postings/list-job-postings.component';
import { DetailJobPostingComponent } from './recruitment/pages/detail-job-posting/detail-job-posting.component';
import { CompanyRegister } from './iam/pages/company-register/company-register';
import { ApplicantRegister } from './iam/pages/applicant-register/applicant-register';

export const routes: Routes = [
  { path: 'vacantes', component: ListJobPostingsComponent },
  { path: 'vacantes/:id', component: DetailJobPostingComponent },
  { path: 'login', component: Login },
  { path: 'register/company', component: CompanyRegister },
  { path: 'register/applicant', component: ApplicantRegister },
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
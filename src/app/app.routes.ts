import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Layout } from './components/shared/layout/layout';
import { Login } from './components/auth/login/login';
import { CompanyRegister } from './components/auth/company-register/company-register';
import { ApplicantRegister } from './components/auth/applicant-register/applicant-register';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { AuthService } from './services/auth.service';
import { Forbidden } from './components/shared/forbidden/forbidden';
import { TakeInterview } from './components/applicant/take-interview/take-interview';
import { ROLE_CANDIDATE, ROLE_RECRUITER } from './models/menu';

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
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).homeUrl() },

      // Reclutador (components/company)
      {
        path: 'recruitment/my-job-postings',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/my-job-postings/my-job-postings').then(
            (m) => m.MyJobPostings,
          ),
      },
      {
        path: 'assessment/sessions/:sessionId',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./assessment/pages/assessment-detail-page/assessment-detail-page').then(
            (m) => m.AssessmentDetailPageComponent,
          ),
      },
      {
        path: 'assessment/ranking',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/ranking-page/ranking-page').then(
            (m) => m.RankingPageComponent,
          ),
      },
      {
        path: 'recruitment/my-job-postings/new',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/create-job-posting/create-job-posting').then(
            (m) => m.CreateJobPosting,
          ),
      },
      {
        path: 'recruitment/my-job-postings/:id/edit',

        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/create-job-posting/create-job-posting').then(
            (m) => m.CreateJobPosting,
          ),
      },
      {
        path: 'recruitment/my-job-postings/:id/criteria',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/job-posting-criteria/job-posting-criteria').then(
            (m) => m.JobPostingCriteria,
          ),
      },
      {
        path: 'recruitment/my-job-postings/:id/script',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/job-posting-script/job-posting-script').then(
            (m) => m.JobPostingScript,
          ),
      },
      {
        path: 'recruitment/my-job-postings/:id/pipeline',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/pipeline/pipeline').then((m) => m.Pipeline),
      },
      {
        path: 'profiles/company',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./components/company/company-profile/company-profile').then((m) => m.CompanyProfilePage),
      },
      {
        path: 'analytics/reports',
        data: { roles: [ROLE_RECRUITER] },
        loadComponent: () =>
          import('./analytics/pages/reports-page/reports-page').then(
            (m) => m.ReportsPage,
          ),
      },

      // Postulante (components/applicant)
      {
        path: 'recruitment/job-postings',
        data: { roles: [ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/applicant/list-job-postings/list-job-postings.component').then(
            (m) => m.ListJobPostingsComponent,
          ),
      },
      {
        path: 'recruitment/job-postings/:id',
        data: { roles: [ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/applicant/detail-job-posting/detail-job-posting.component').then(
            (m) => m.DetailJobPostingComponent,
          ),
      },
      {
        path: 'recruitment/my-applications',
        data: { roles: [ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/applicant/my-applications/my-applications').then(
            (m) => m.MyApplications,
          ),
      },
      {
        path: 'recruitment/my-applications/:id/feedback',
        data: { roles: [ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/applicant/application-feedback/application-feedback').then(
            (m) => m.ApplicationFeedback,
          ),
      },
      {
        path: 'profiles/me',
        data: { roles: [ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/applicant/my-profile/my-profile').then((m) => m.MyProfile),
      },
      {
        path: 'profiles/certifications',
        data: { roles: [ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/applicant/certifications/certifications').then((m) => m.Certifications),
      },
      // US-08: el postulante rinde su entrevista. "Mis postulaciones" (US-23) enlazará aquí.
      {
        path: 'interviews/take-interview/:applicationId',
        component: TakeInterview,
        data: { roles: [ROLE_CANDIDATE] },
      },

      // Ambos roles: calendario y notificaciones
      {
        path: 'calendar',
        data: { roles: [ROLE_RECRUITER, ROLE_CANDIDATE] },
        loadComponent: () => import('./components/shared/calendar/calendar').then((m) => m.CalendarPage),
      },
      {
        path: 'notifications',
        data: { roles: [ROLE_RECRUITER, ROLE_CANDIDATE] },
        loadComponent: () =>
          import('./components/shared/notifications/notifications').then((m) => m.NotificationsPage),
      },

      // 403
      { path: 'forbidden', component: Forbidden },
    ],
  },

  // Cualquier otra dirección vuelve al inicio. Siempre debe ir al final.
  { path: '**', redirectTo: '' },
];

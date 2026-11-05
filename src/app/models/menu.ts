/** Opción del menú lateral. */
export interface MenuItem {
  /** Clave de traducción (ver public/assets/i18n). */
  label: string;
  icon: string;
  route: string;
}

export const ROLE_RECRUITER = 'ROLE_RECRUITER';
export const ROLE_CANDIDATE = 'ROLE_CANDIDATE';

/** Menú lateral de cada rol (US-28). */
export const MENU_BY_ROLE: Record<string, MenuItem[]> = {
  [ROLE_RECRUITER]: [
    { label: 'shared.menu.myJobPostings', icon: 'work', route: '/recruitment/my-job-postings' },
    { label: 'shared.menu.ranking', icon: 'leaderboard', route: '/assessment/ranking' },
    { label: 'shared.menu.reports', icon: 'bar_chart', route: '/analytics/reports' },
  ],
  [ROLE_CANDIDATE]: [
    { label: 'shared.menu.jobPostings', icon: 'search', route: '/recruitment/job-postings' },
    { label: 'shared.menu.myApplications', icon: 'assignment', route: '/recruitment/my-applications' },
    { label: 'shared.menu.myProfile', icon: 'person', route: '/profiles/me' },
    { label: 'shared.menu.certifications', icon: 'verified', route: '/profiles/certifications' },
  ],
};

/** Página a la que llega cada rol después del login. */
export const HOME_BY_ROLE: Record<string, string> = {
  [ROLE_RECRUITER]: '/recruitment/my-job-postings',
  [ROLE_CANDIDATE]: '/recruitment/job-postings',
};

/** Clave de traducción del nombre del rol (barra superior). */
export const ROLE_LABELS: Record<string, string> = {
  [ROLE_RECRUITER]: 'shared.roles.recruiter',
  [ROLE_CANDIDATE]: 'shared.roles.candidate',
  ROLE_ADMIN: 'shared.roles.admin',
};

/** Opción del menú lateral. */
export interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

export const ROLE_RECRUITER = 'ROLE_RECRUITER';
export const ROLE_CANDIDATE = 'ROLE_CANDIDATE';

/** Menú lateral de cada rol (US-28). */
export const MENU_BY_ROLE: Record<string, MenuItem[]> = {
  [ROLE_RECRUITER]: [
    { label: 'Mis vacantes', icon: 'work', route: '/recruitment/my-job-postings' },
    { label: 'Ranking', icon: 'leaderboard', route: '/assessment/ranking' },
    { label: 'Reportes', icon: 'bar_chart', route: '/analytics/reports' },
  ],
  [ROLE_CANDIDATE]: [
    { label: 'Vacantes', icon: 'search', route: '/recruitment/job-postings' },
    { label: 'Mis postulaciones', icon: 'assignment', route: '/recruitment/my-applications' },
    { label: 'Mi perfil', icon: 'person', route: '/profiles/me' },
    { label: 'Certificaciones', icon: 'verified', route: '/profiles/certifications' },
  ],
};

/** Página a la que llega cada rol después del login. */
export const HOME_BY_ROLE: Record<string, string> = {
  [ROLE_RECRUITER]: '/recruitment/my-job-postings',
  [ROLE_CANDIDATE]: '/recruitment/job-postings',
};

/** Nombre del rol para mostrar en la barra superior. */
export const ROLE_LABELS: Record<string, string> = {
  [ROLE_RECRUITER]: 'Reclutador',
  [ROLE_CANDIDATE]: 'Postulante',
  ROLE_ADMIN: 'Administrador',
};

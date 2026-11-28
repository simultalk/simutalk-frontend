/** Tipos de notificación que genera la app. */
export type NotificationKind =
  | 'WELCOME'
  | 'APPLICATION_STATUS' // postulante: su postulación cambió de etapa
  | 'INTERVIEW_INVITE' // postulante: lo invitaron a una entrevista
  | 'INTERVIEW_DEADLINE' // postulante: su entrevista está por vencer
  | 'NEW_POSTING' // postulante: se publicó una vacante nueva
  | 'POSTING_CLOSING' // ambos: una vacante cierra pronto
  | 'NEW_APPLICATION' // reclutador: llegaron postulantes nuevos
  | 'CANDIDATE_ASSESSED'; // reclutador: un postulante ya tiene evaluación

/**
 * Una notificación guarda las claves de traducción y sus parámetros (no el texto),
 * así se lee bien aunque la persona cambie de idioma después.
 */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  titleKey: string;
  bodyKey: string;
  params: Record<string, string | number>;
  createdAt: string; // ISO
  read: boolean;
  link?: string;
}

/** Lo último que se vio del servidor, para detectar qué cambió entre una revisión y otra. */
export interface NotificationSnapshot {
  applicationStatus: Record<string, string>;
  postingIds: number[];
  sessionIds: number[];
  applicationIds: number[];
}

export interface NotificationStore {
  initialized: boolean;
  pushEnabled: boolean;
  items: AppNotification[];
  snapshot: NotificationSnapshot;
}

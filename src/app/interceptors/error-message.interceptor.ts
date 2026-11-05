import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';

/**
 * El backend responde sus errores en inglés. Este interceptor reconoce los más comunes y los
 * muestra en el idioma elegido (claves shared.errors.*), sin cambiar el código de cada pantalla.
 * Los grupos de cada patrón llenan los parámetros indicados, en el mismo orden.
 */
const ERRORES: [RegExp, string, string[]?][] = [
  // Vacantes y criterios
  [/^A closed job posting cannot be modified$/, 'closedPosting'],
  [/^The job posting is already closed$/, 'alreadyClosed'],
  [/^A job posting cannot go back to DRAFT$/, 'backToDraft'],
  [/^A published job posting cannot be deleted; close it first$/, 'deletePublished'],
  [/^Only a DRAFT job posting can be published/, 'publishOnlyDraft'],
  [/^A job posting needs at least one evaluation criterion to be published$/, 'publishNeedsCriterion'],
  [/^The weights of the evaluation criteria must add up to exactly (\d+) \(current total: (\d+)\)$/, 'weightsTotal', ['expected', 'current']],
  [/^Every COMPETENCY criterion needs at least one interview question before publishing; missing: \[(.*)\]$/, 'missingQuestions', ['names']],
  [/^An evaluation criterion named '(.*)' already exists in this job posting$/, 'duplicateCriterion', ['name']],
  [/^Evaluation criteria can only be modified while the job posting is in DRAFT/, 'criteriaOnlyDraft'],
  [/^Anonymized screening can only be changed while the job posting is in DRAFT$/, 'anonymizedOnlyDraft'],
  [/^Criteria can only be suggested while the job posting is in DRAFT/, 'suggestCriteriaOnlyDraft'],
  [/^Questions can only be suggested while the job posting is in DRAFT$/, 'suggestQuestionsOnlyDraft'],
  [/^The interview script can only change while the job posting is in DRAFT$/, 'scriptOnlyDraft'],
  [/^Criterion \d+ is a CERTIFICATION criterion/, 'questionsOnlyCompetency'],
  [/^The authenticated user has no company profile/, 'noCompanyProfile'],

  // Postulaciones y entrevistas
  [/^Applications are only accepted for PUBLISHED job postings/, 'applyOnlyPublished'],
  [/^The candidate already applied to this job posting$/, 'alreadyApplied'],
  [/^The authenticated user has no candidate profile to apply with$/, 'noCandidateProfile'],
  [/^The application already has an interview session$/, 'alreadyHasInterview'],
  [/^An interview can only be created for a RECEIVED application/, 'inviteOnlyReceived'],
  [/^The job posting has no interview questions yet$/, 'noQuestionsYet'],
  [/^Question \d+ has already been answered$/, 'alreadyAnswered'],
  [/^Question \d+ does not allow follow-up questions$/, 'noFollowUp'],
  [/^Question \d+ already has a follow-up$/, 'followUpUsed'],
  [/^(\d+) of (\d+) questions are still unanswered$/, 'unanswered', ['missing', 'total']],
  [/^Only a COMPLETED interview can be assessed/, 'assessOnlyCompleted'],
  [/^This interview has already been assessed$/, 'alreadyAssessed'],

  // Cuentas y perfiles
  [/^Username already exists$/, 'usernameTaken'],
  [/^A candidate with that document number already exists$/, 'documentTaken'],
  [/^A company with RUC (\d+) already exists$/, 'rucTaken', ['ruc']],
  [/^Candidate must be at least (\d+) years old$/, 'minAge', ['age']],

  // Genéricos
  [/^.+ with id \d+ not found$/, 'notFound'],
];

const POR_ESTADO: Record<number, string> = { 0: 'network', 403: 'forbidden', 500: 'server' };

export const errorMessageInterceptor: HttpInterceptorFn = (req, next) => {
  // TranslateService se pide recién cuando hay un error: pedirlo antes crea una dependencia
  // circular, porque el propio TranslateService carga los idiomas con HttpClient.
  const injector = inject(Injector);

  const traducir = (i18n: TranslateService, mensaje: string): string => {
    for (const [patron, clave, nombres = []] of ERRORES) {
      const m = patron.exec(mensaje);
      if (!m) continue;
      const params: Record<string, string> = {};
      nombres.forEach((nombre, i) => (params[nombre] = m[i + 1]));
      return i18n.instant(`shared.errors.${clave}`, params);
    }
    return mensaje;
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const i18n = injector.get(TranslateService);
      const original: string | undefined = error.error?.message;
      const porEstado = POR_ESTADO[error.status];
      const message = original ? traducir(i18n, original) : porEstado ? i18n.instant(`shared.errors.${porEstado}`) : undefined;
      if (!message) return throwError(() => error);

      return throwError(
        () =>
          new HttpErrorResponse({
            error: { ...(typeof error.error === 'object' ? error.error : {}), message },
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
          }),
      );
    }),
  );
};

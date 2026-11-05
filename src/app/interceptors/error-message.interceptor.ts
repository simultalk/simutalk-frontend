import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * El backend responde sus errores en inglés. Este interceptor traduce los más comunes
 * para que todas las pantallas muestren el mensaje en español sin cambiar su código.
 */
const TRADUCCIONES: [RegExp, string][] = [
  // Vacantes y criterios
  [/^A closed job posting cannot be modified$/, 'Una vacante cerrada ya no se puede modificar.'],
  [/^The job posting is already closed$/, 'La vacante ya está cerrada.'],
  [/^A job posting cannot go back to DRAFT$/, 'Una vacante no puede volver a borrador.'],
  [/^A published job posting cannot be deleted; close it first$/, 'Una vacante publicada no se puede eliminar. Ciérrala primero.'],
  [/^Only a DRAFT job posting can be published.*$/, 'Solo se puede publicar una vacante en borrador.'],
  [/^A job posting needs at least one evaluation criterion to be published$/, 'Para publicar, la vacante necesita al menos un criterio.'],
  [/^The weights of the evaluation criteria must add up to exactly (\d+) \(current total: (\d+)\)$/, 'Los pesos de los criterios deben sumar $1. Ahora suman $2.'],
  [/^Every COMPETENCY criterion needs at least one interview question before publishing; missing: \[(.*)\]$/, 'Cada competencia necesita al menos una pregunta antes de publicar. Faltan: $1.'],
  [/^An evaluation criterion named '(.*)' already exists in this job posting$/, 'Ya existe un criterio llamado "$1" en esta vacante.'],
  [/^Evaluation criteria can only be modified while the job posting is in DRAFT.*$/, 'Los criterios solo se pueden cambiar mientras la vacante es borrador.'],
  [/^Anonymized screening can only be changed while the job posting is in DRAFT$/, 'El cribado anónimo solo se puede cambiar mientras la vacante es borrador.'],
  [/^Criteria can only be suggested while the job posting is in DRAFT.*$/, 'Solo se pueden sugerir criterios mientras la vacante es borrador.'],
  [/^Questions can only be suggested while the job posting is in DRAFT$/, 'Solo se pueden sugerir preguntas mientras la vacante es borrador.'],
  [/^The interview script can only change while the job posting is in DRAFT$/, 'El guion solo se puede cambiar mientras la vacante es borrador.'],
  [/^Criterion \d+ is a CERTIFICATION criterion.*$/, 'Las preguntas solo se asignan a criterios de tipo competencia.'],
  [/^The authenticated user has no company profile.*$/, 'Tu usuario no tiene un perfil de empresa.'],

  // Postulaciones y entrevistas
  [/^Applications are only accepted for PUBLISHED job postings.*$/, 'Solo se puede postular a vacantes publicadas.'],
  [/^The candidate already applied to this job posting$/, 'Ya postulaste a esta vacante.'],
  [/^The authenticated user has no candidate profile to apply with$/, 'Completa tu perfil de postulante antes de postular.'],
  [/^The application already has an interview session$/, 'Esta postulación ya tiene una entrevista.'],
  [/^An interview can only be created for a RECEIVED application.*$/, 'Solo se puede invitar a postulaciones recién recibidas.'],
  [/^The job posting has no interview questions yet$/, 'La vacante todavía no tiene preguntas.'],
  [/^Question \d+ has already been answered$/, 'Esa pregunta ya fue respondida.'],
  [/^Question \d+ does not allow follow-up questions$/, 'Esa pregunta no permite repregunta.'],
  [/^Question \d+ already has a follow-up$/, 'Esa pregunta ya tuvo su repregunta.'],
  [/^(\d+) of (\d+) questions are still unanswered$/, 'Faltan responder $1 de $2 preguntas.'],
  [/^Only a COMPLETED interview can be assessed.*$/, 'Solo se puede evaluar una entrevista terminada.'],
  [/^This interview has already been assessed$/, 'Esta entrevista ya fue evaluada.'],

  // Cuentas y perfiles
  [/^Username already exists$/, 'Ese usuario o correo ya está registrado.'],
  [/^A candidate with that document number already exists$/, 'Ya existe un postulante con ese documento.'],
  [/^A company with RUC (\d+) already exists$/, 'Ya existe una empresa con el RUC $1.'],
  [/^Candidate must be at least (\d+) years old$/, 'Debes tener al menos $1 años.'],

  // Genéricos
  [/^(.+) with id \d+ not found$/, 'No se encontró el registro.'],
];

const POR_ESTADO: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Revisa tu conexión.',
  403: 'No tienes permiso para hacer esto.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo.',
};

function traducir(mensaje: string): string {
  for (const [patron, texto] of TRADUCCIONES) {
    if (patron.test(mensaje)) return mensaje.replace(patron, texto);
  }
  return mensaje;
}

export const errorMessageInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const original: string | undefined = error.error?.message;
      const message = original ? traducir(original) : POR_ESTADO[error.status];
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

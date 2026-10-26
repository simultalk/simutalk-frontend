import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { InterviewSession, InviteInterviewDialogData } from '../../../models/interview-session';
import { InterviewSessionService } from '../../../services/interview-session';

const DEFAULT_DAYS_TO_ANSWER = 7;

/**
 * US-07: invita a un postulante a la entrevista asincrónica. Recibe el applicationId y, si la
 * invitación sale bien, se cierra devolviendo la sesión creada (en PENDING).
 *
 * Uso:
 *   this.dialog.open(InviteInterviewDialog, { data: { applicationId } })
 *     .afterClosed().subscribe(session => { if (session) { ... } });
 */
@Component({
  selector: 'app-invite-interview-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
  templateUrl: './invite-interview-dialog.html',
  styleUrl: './invite-interview-dialog.css',
})
export class InviteInterviewDialog {
  private readonly fb = inject(FormBuilder);
  private readonly sessions = inject(InterviewSessionService);
  private readonly dialogRef = inject<MatDialogRef<InviteInterviewDialog, InterviewSession>>(MatDialogRef);
  readonly data = inject<InviteInterviewDialogData>(MAT_DIALOG_DATA);

  /**
   * Desde mañana: el backend compara la fecha con el día en UTC, que en Lima ya es "mañana"
   * desde las 7 p. m.; elegir "hoy" a esa hora sería rechazado.
   */
  readonly minDate = addDays(startOfToday(), 1);

  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    expiresAt: [addDays(startOfToday(), DEFAULT_DAYS_TO_ANSWER), Validators.required],
  });

  submit(): void {
    const expiresAt = this.form.controls.expiresAt.value;
    if (this.form.invalid || !expiresAt) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.dialogRef.disableClose = true;

    this.sessions.invite(this.data.applicationId, toIsoDate(expiresAt)).subscribe({
      next: (session) => this.dialogRef.close(session),
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.dialogRef.disableClose = false;
        this.errorMessage.set(inviteErrorMessage(error, this.data.applicationId));
      },
    });
  }
}

/** Fecha local en yyyy-MM-dd, que es lo que espera el backend (sin hora ni zona). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Traduce los errores del backend a un mensaje que el reclutador entienda. */
export function inviteErrorMessage(error: HttpErrorResponse, applicationId: number): string {
  const backendMessage: string = error.error?.message ?? '';
  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
    case 400:
      return 'La fecha límite no es válida: elige una fecha a partir de mañana.';
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403:
      return 'Solo el reclutador dueño de la vacante puede invitar a este postulante.';
    case 404:
      return `No existe la postulación ${applicationId}.`;
    case 422:
      if (backendMessage.includes('already has an interview session')) {
        return 'Este postulante ya fue invitado a la entrevista.';
      }
      if (backendMessage.includes('no interview questions')) {
        return 'La vacante aún no tiene preguntas en su guion. Agrégalas antes de invitar.';
      }
      if (backendMessage.includes('RECEIVED')) {
        return 'Solo se puede invitar a postulaciones que están en la etapa Recibida.';
      }
      return backendMessage || 'No se pudo enviar la invitación.';
    default:
      return 'No se pudo enviar la invitación. Inténtalo de nuevo.';
  }
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

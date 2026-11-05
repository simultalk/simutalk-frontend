import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    TranslatePipe,
  ],
  providers: [
    provideNativeDateAdapter(),
    // El calendario se muestra en el idioma elegido en la app.
    {
      provide: MAT_DATE_LOCALE,
      useFactory: () => (inject(TranslateService).getCurrentLang()?.startsWith('en') ? 'en-US' : 'es-PE'),
    },
  ],
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
        this.errorMessage.set(inviteErrorMessage(error));
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

/**
 * Mensaje de error para el reclutador: una clave interviews.inviteDialog.errors.*, o el mensaje del
 * backend, que errorMessageInterceptor ya tradujo (ya invitado, vacante sin preguntas, etapa incorrecta).
 */
export function inviteErrorMessage(error: HttpErrorResponse): string {
  switch (error.status) {
    case 0:
      return 'interviews.inviteDialog.errors.network';
    case 400:
      return 'interviews.inviteDialog.errors.invalidDate';
    case 401:
      return 'interviews.inviteDialog.errors.sessionExpired';
    case 403:
      return 'interviews.inviteDialog.errors.forbidden';
    case 404:
      return 'interviews.inviteDialog.errors.notFound';
    case 422:
      return error.error?.message || 'interviews.inviteDialog.errors.generic';
    default:
      return 'interviews.inviteDialog.errors.generic';
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

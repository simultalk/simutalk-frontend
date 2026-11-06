import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { InterviewSessionService } from '../../../services/interview-session';
import { InviteInterviewDialog, inviteErrorMessage, toIsoDate } from './invite-interview-dialog';

function httpError(status: number, message = ''): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { message } });
}

describe('InviteInterviewDialog', () => {
  const session = { id: 9, applicationId: 5, status: 'PENDING', expiresAt: '2026-11-15' };
  let invite: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let dialog: InviteInterviewDialog;

  beforeEach(() => {
    invite = vi.fn();
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [InviteInterviewDialog],
      providers: [
        provideTranslateService(),
        { provide: InterviewSessionService, useValue: { invite } },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
        { provide: MAT_DIALOG_DATA, useValue: { applicationId: 5 } },
      ],
    });
    dialog = TestBed.createComponent(InviteInterviewDialog).componentInstance;
  });

  it('propone por defecto una fecha límite dentro de 7 días y no permite elegir hoy', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = (date: Date) => Math.round((date.getTime() - today.getTime()) / 86_400_000);

    expect(days(dialog.form.controls.expiresAt.value!)).toBe(7);
    expect(days(dialog.minDate)).toBe(1);
  });

  it('envía la invitación con la fecha en yyyy-MM-dd y se cierra devolviendo la sesión', () => {
    invite.mockReturnValue(of(session));
    dialog.form.controls.expiresAt.setValue(new Date(2026, 10, 15));

    dialog.submit();

    expect(invite).toHaveBeenCalledWith(5, '2026-11-15');
    expect(close).toHaveBeenCalledWith(session);
  });

  it('no llama al backend si falta la fecha', () => {
    dialog.form.controls.expiresAt.setValue(null);

    dialog.submit();

    expect(invite).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('si el backend rechaza, muestra el motivo y no se cierra', () => {
    // El interceptor ya tradujo el mensaje del backend.
    invite.mockReturnValue(throwError(() => httpError(422, 'Esta postulación ya tiene una entrevista.')));

    dialog.submit();

    expect(close).not.toHaveBeenCalled();
    expect(dialog.loading()).toBe(false);
    expect(dialog.errorMessage()).toBe('Esta postulación ya tiene una entrevista.');
  });
});

describe('toIsoDate', () => {
  it('usa la fecha local, sin desfase de zona horaria', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('inviteErrorMessage', () => {
  it.each([
    [0, '', 'interviews.inviteDialog.errors.network'],
    [400, '', 'interviews.inviteDialog.errors.invalidDate'],
    [403, '', 'interviews.inviteDialog.errors.forbidden'],
    [404, '', 'interviews.inviteDialog.errors.notFound'],
    [422, 'La vacante todavía no tiene preguntas.', 'La vacante todavía no tiene preguntas.'],
    [422, '', 'interviews.inviteDialog.errors.generic'],
  ])('status %i con "%s"', (status, message, expected) => {
    expect(inviteErrorMessage(httpError(status, message))).toBe(expected);
  });
});

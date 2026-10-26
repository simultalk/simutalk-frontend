import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../services/auth.service';
import { InterviewSession } from '../../../models/interview-session';
import { InviteInterviewDialog } from '../invite-interview-dialog/invite-interview-dialog';

/**
 * Página TEMPORAL para probar la US-07 con una postulación demo. En el Sprint 4 el diálogo se abre
 * desde el pipeline de postulaciones y esta página se elimina junto con su ruta.
 */
@Component({
  selector: 'app-invitation-test',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './invitation-test.html',
  styleUrl: './invitation-test.css',
})
export class InvitationTest {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  session = signal<InterviewSession | null>(null);

  form = this.fb.group({
    applicationId: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  openDialog(): void {
    const applicationId = this.form.controls.applicationId.value;
    if (this.form.invalid || !applicationId) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialog
      .open<InviteInterviewDialog, { applicationId: number }, InterviewSession>(InviteInterviewDialog, {
        data: { applicationId },
        width: '440px',
      })
      .afterClosed()
      .subscribe((session) => {
        if (session) {
          this.session.set(session);
        }
      });
  }
}

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { InviteInterviewDialog } from '../invite-interview-dialog/invite-interview-dialog';
import { InvitationTest } from './invitation-test';

describe('InvitationTest', () => {
  it('abre el diálogo con el applicationId y muestra la sesión creada', () => {
    const session = { id: 9, applicationId: 5, status: 'PENDING', expiresAt: '2026-11-15', invitedAt: '2026-10-23T22:00:00Z' };
    const open = vi.fn().mockReturnValue({ afterClosed: () => of(session) });
    TestBed.configureTestingModule({
      imports: [InvitationTest],
      providers: [provideRouter([]), { provide: MatDialog, useValue: { open } }],
    });
    const fixture = TestBed.createComponent(InvitationTest);
    const page = fixture.componentInstance;

    page.form.controls.applicationId.setValue(5);
    page.openDialog();
    fixture.detectChanges();

    expect(open).toHaveBeenCalledWith(InviteInterviewDialog, expect.objectContaining({ data: { applicationId: 5 } }));
    expect(page.session()).toEqual(session);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sesión 9 · estado PENDING');
  });
});

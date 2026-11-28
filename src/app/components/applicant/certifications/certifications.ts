import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProfileService } from '../../../services/profile.service';
import { Certification, CertificationRequest } from '../../../models/profile.model';

/** La fecha de vencimiento, si se pone, tiene que ser después de la de emisión. */
function expiresAfterIssued(group: AbstractControl): ValidationErrors | null {
  const issuedAt = group.get('issuedAt')?.value as Date | null;
  const expiresAt = group.get('expiresAt')?.value as Date | null;
  if (!issuedAt || !expiresAt) return null;
  return toIsoDate(expiresAt) > toIsoDate(issuedAt) ? null : { expiresBeforeIssued: true };
}

/** US-15: el postulante registra sus certificaciones. US-16: las verifica con el emisor. */
@Component({
  selector: 'app-certifications',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSnackBarModule,
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
  templateUrl: './certifications.html',
  styleUrl: './certifications.css',
})
export class Certifications implements OnInit {
  private fb = inject(FormBuilder);
  private i18n = inject(TranslateService);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);

  private candidateId = 0;
  readonly today = startOfToday();

  certifications = signal<Certification[]>([]);
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');
  errorMessage = signal('');
  // id de la certificación que se está verificando (US-16)
  verifyingId = signal<number | null>(null);

  form = this.fb.group(
    {
      title: ['', [Validators.required, Validators.maxLength(150)]],
      issuer: ['', [Validators.required, Validators.maxLength(100)]],
      credentialCode: ['', Validators.maxLength(100)],
      issuedAt: [null as Date | null, Validators.required],
      expiresAt: [null as Date | null],
    },
    { validators: expiresAfterIssued },
  );

  ngOnInit(): void {
    this.profileService.getMyCandidateId().subscribe({
      next: (id) => {
        this.candidateId = id;
        this.load();
      },
      error: (err) => {
        this.loadError.set(err.error?.message || this.i18n.instant('profiles.certifications.loadError'));
        this.loading.set(false);
      },
    });
  }

  load(): void {
    this.profileService.getCertifications(this.candidateId).subscribe({
      next: (list) => {
        this.certifications.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err.error?.message || this.i18n.instant('profiles.certifications.loadError'));
        this.loading.set(false);
      },
    });
  }

  /** Sin código no se puede consultar al emisor: se avisa en el formulario. */
  withoutCode(): boolean {
    return !this.form.controls.credentialCode.value?.trim();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: CertificationRequest = {
      title: value.title!.trim(),
      issuer: value.issuer!.trim(),
      credentialCode: value.credentialCode?.trim() || null,
      issuedAt: toIsoDate(value.issuedAt!),
      expiresAt: value.expiresAt ? toIsoDate(value.expiresAt) : null,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.profileService.addCertification(this.candidateId, request).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.certifications.update((list) => [...list, created]);
        this.form.reset();
        this.snackBar.open(this.i18n.instant('profiles.certifications.added'), 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || this.i18n.instant('profiles.certifications.saveError'));
      },
    });
  }

  remove(certification: Certification): void {
    if (!confirm(this.i18n.instant('profiles.certifications.confirmRemove', { title: certification.title }))) return;

    this.profileService.deleteCertification(this.candidateId, certification.id).subscribe({
      next: () => {
        this.certifications.update((list) => list.filter((c) => c.id !== certification.id));
        this.snackBar.open(this.i18n.instant('profiles.certifications.removed'), 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.instant('profiles.certifications.removeError'), 'OK', {
          duration: 5000,
        });
      },
    });
  }

  /** Solo se consulta al emisor si tiene código y aún no se verificó (US-16). */
  canVerify(certification: Certification): boolean {
    return certification.verificationStatus === 'UNVERIFIED' && !!certification.credentialCode?.trim();
  }

  verify(certification: Certification): void {
    this.verifyingId.set(certification.id);
    this.profileService.verifyCertification(this.candidateId, certification.id).subscribe({
      next: (result) => {
        this.verifyingId.set(null);
        this.certifications.update((list) =>
          list.map((c) => (c.id === result.certification.id ? result.certification : c)),
        );
        const key = !result.conclusive
          ? 'profiles.certifications.verifyInconclusive'
          : result.matched
            ? 'profiles.certifications.verifyMatched'
            : 'profiles.certifications.verifyNotMatched';
        const message = this.i18n.instant(key);
        this.snackBar.open(result.detail ? `${message}. ${result.detail}` : message, 'OK', {
          duration: result.conclusive && result.matched ? 4000 : 7000,
        });
      },
      error: (err) => {
        this.verifyingId.set(null);
        this.snackBar.open(err.error?.message || this.i18n.instant('profiles.certifications.verifyError'), 'OK', {
          duration: 5000,
        });
      },
    });
  }
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

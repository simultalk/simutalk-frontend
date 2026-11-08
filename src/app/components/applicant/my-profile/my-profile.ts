import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ProfileService } from '../../../services/profile.service';
import { CandidateProfile, Certification, UpdateCandidateProfileRequest } from '../../../models/profile.model';

/** El postulante tiene que ser mayor de edad (misma regla que en el registro). */
function adultBirthDate(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const birth = new Date(`${control.value}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return !Number.isNaN(birth.getTime()) && age >= 18 ? null : { adult: true };
}

/** Mi perfil: el postulante ve un resumen de su perfil y edita sus datos (PUT /candidate-profiles/{id}). */
@Component({
  selector: 'app-my-profile',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css',
})
export class MyProfile implements OnInit {
  private fb = inject(FormBuilder);
  private i18n = inject(TranslateService);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);

  profile = signal<CandidateProfile | null>(null);
  loading = signal(true);
  loadError = signal('');
  saving = signal(false);
  saveError = signal('');

  /** Fecha máxima del calendario: nadie nace en el futuro. */
  readonly maxBirthDate = new Date().toISOString().slice(0, 10);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
    birthDate: ['', [Validators.required, adultBirthDate]],
    phone: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^\+?[0-9\s-]{6,20}$/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    district: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
    yearsOfExperience: [0, [Validators.required, Validators.min(0), Validators.max(60)]],
  });

  fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  });

  initials = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return `${p.firstName.trim()[0] ?? ''}${p.lastName.trim()[0] ?? ''}`.toUpperCase();
  });

  /** Edad calculada a partir de la fecha de nacimiento. */
  age = computed(() => {
    const p = this.profile();
    if (!p) return null;
    const birth = new Date(`${p.birthDate}T00:00:00`);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      years--;
    }
    return years;
  });

  /** Las tres certificaciones más recientes, para el resumen lateral. */
  recentCertifications = computed<Certification[]>(() =>
    [...(this.profile()?.certifications ?? [])]
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      .slice(0, 3),
  );

  /** Qué tan completo está el perfil (0-100): datos de contacto y al menos una certificación verificada. */
  completeness = computed(() => {
    const p = this.profile();
    if (!p) return 0;
    const checks = [
      !!p.firstName,
      !!p.lastName,
      !!p.birthDate,
      !!p.phone,
      !!p.district,
      !!p.email,
      p.yearsOfExperience > 0,
      p.certifications.length > 0,
      p.verifiedCertificationCount > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  });

  ngOnInit(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.setProfile(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(this.i18n.instant('profiles.me.loadError'));
        this.loading.set(false);
      },
    });
  }

  /** Vuelve el formulario a los datos guardados. */
  discard(): void {
    const p = this.profile();
    if (p) this.fillForm(p);
    this.saveError.set('');
  }

  save(): void {
    const p = this.profile();
    if (!p) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const request: UpdateCandidateProfileRequest = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      birthDate: v.birthDate,
      phone: v.phone.trim(),
      district: v.district.trim(),
      yearsOfExperience: Number(v.yearsOfExperience),
      email: v.email.trim() || null,
    };

    this.saving.set(true);
    this.saveError.set('');
    this.profileService.updateMyProfile(p.id, request).subscribe({
      next: (updated) => {
        this.setProfile(updated);
        this.saving.set(false);
        this.snackBar.open(this.i18n.instant('profiles.me.saved'), undefined, { duration: 3000 });
      },
      error: () => {
        this.saveError.set(this.i18n.instant('profiles.me.saveError'));
        this.saving.set(false);
      },
    });
  }

  /** Clase de la etiqueta según el estado de la certificación. */
  statusTagClass(c: Certification): string {
    if (c.expired) return 'st-tag st-tag--neutral';
    switch (c.verificationStatus) {
      case 'VERIFIED':
        return 'st-tag';
      case 'REJECTED':
        return 'st-tag st-tag--danger';
      default:
        return 'st-tag st-tag--warning';
    }
  }

  statusKey(c: Certification): string {
    return `profiles.certifications.status.${c.expired ? 'EXPIRED' : c.verificationStatus}`;
  }

  private setProfile(profile: CandidateProfile): void {
    this.profile.set(profile);
    this.fillForm(profile);
  }

  private fillForm(p: CandidateProfile): void {
    this.form.reset({
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      phone: p.phone,
      email: p.email ?? '',
      district: p.district,
      yearsOfExperience: p.yearsOfExperience,
    });
  }
}

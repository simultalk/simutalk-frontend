import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApplicantRegistrationError, RegistrationService } from '../../../services/registration.service';

function adultBirthDate(control: AbstractControl) {
  if (!control.value) return null;
  const birth = new Date(`${control.value}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return !Number.isNaN(birth.getTime()) && age >= 18 ? null : { adult: true };
}

@Component({
  selector: 'app-applicant-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './applicant-register.html',
  styleUrl: './applicant-register.css',
})
export class ApplicantRegister {
  private fb = inject(FormBuilder);
  private registration = inject(RegistrationService);

  loading = signal(false);
  errorMessage = signal('');
  success = signal(false);
  completeExistingAccount = signal(false);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
    documentNumber: ['', [Validators.required, Validators.pattern(/^\d{8,12}$/)]],
    birthDate: ['', [Validators.required, adultBirthDate]],
    district: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
    yearsOfExperience: [0, [Validators.required, Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  submit(): void {
    if (this.loading() || this.success()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.success.set(false);

    this.registration.registerApplicant(this.form.getRawValue(), this.completeExistingAccount()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.form.reset();
      },
      error: (failure: ApplicantRegistrationError) => {
        this.loading.set(false);
        if (failure.accountCreated) this.completeExistingAccount.set(true);
        const error = failure.cause;
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'No se pudo iniciar sesión. Revisa el correo y la contraseña.'
            : failure.accountCreated
              ? 'La cuenta ya existe, pero no se pudo completar el perfil. Revisa los datos y vuelve a intentar. ' +
                (error instanceof HttpErrorResponse ? error.error?.message ?? '' : '')
              : error instanceof HttpErrorResponse && (error.status === 409 || error.status === 422)
                ? 'No se pudo crear la cuenta; el correo puede estar registrado. Si ya tienes cuenta, selecciona completar perfil.'
                : 'No se pudo crear la cuenta. Revisa los datos y la conexión e inténtalo de nuevo.'
        );
      },
    });
  }
}

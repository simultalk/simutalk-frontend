import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RegistrationService } from '../../services/registration.service';

@Component({
  selector: 'app-company-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './company-register.html',
  styleUrl: './company-register.css',
})
export class CompanyRegister {
  private fb = inject(FormBuilder);
  private registration = inject(RegistrationService);

  loading = signal(false);
  errorMessage = signal('');
  success = signal(false);

  form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.minLength(3)]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    corporateEmail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.success.set(false);

    this.registration.registerCompany(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.form.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.status === 409
            ? 'Ya existe una empresa registrada con ese RUC o correo.'
            : 'No se pudo completar el registro. Inténtalo de nuevo.'
        );
      },
    });
  }
}

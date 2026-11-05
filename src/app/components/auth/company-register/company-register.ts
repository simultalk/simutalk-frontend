import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RegistrationService } from '../../../services/registration.service';
import { CompanySize } from '../../../models/registration.model';

@Component({
  selector: 'app-company-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './company-register.html',
  styleUrl: './company-register.css',
})
export class CompanyRegister {
  private fb = inject(FormBuilder);
  private registration = inject(RegistrationService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  errorMessage = signal('');

  sizes: { value: CompanySize; label: string }[] = [
    { value: 'MICRO', label: 'Micro (hasta 10 trabajadores)' },
    { value: 'PEQUENA', label: 'Pequeña (11 a 100)' },
    { value: 'MEDIANA', label: 'Mediana (101 a 250)' },
    { value: 'GRANDE', label: 'Grande (más de 250)' },
  ];

  form = this.fb.nonNullable.group({
    legalName: ['', [Validators.required, Validators.maxLength(150)]],
    tradeName: ['', [Validators.required, Validators.maxLength(150)]],
    industry: ['', [Validators.required, Validators.maxLength(150)]],
    // RUC de 11 dígitos que empieza en 10 o 20
    ruc: ['', [Validators.required, Validators.pattern(/^(10|20)\d{9}$/)]],
    companySize: ['MICRO' as CompanySize, Validators.required],
    district: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.registration.registerCompany(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Empresa registrada. ¡Bienvenido a SimuTalk!', 'OK', { duration: 4000 });
        // La sesión ya quedó iniciada: va directo a crear su primera vacante
        this.router.navigate(['/recruitment/my-job-postings']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.message || 'No se pudo completar el registro. Inténtalo de nuevo.');
      },
    });
  }
}

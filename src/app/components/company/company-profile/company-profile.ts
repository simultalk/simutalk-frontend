import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { ProfileService } from '../../../services/profile.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { CompanyProfile, CompanySize, UpdateCompanyProfileRequest } from '../../../models/profile.model';
import { CompanySummaryReport } from '../../../models/analytics.model';
import { CountUp } from '../../shared/count-up/count-up';

/** Mi empresa: el reclutador ve los indicadores de su empresa y edita sus datos (PUT /company-profiles/{id}). */
@Component({
  selector: 'app-company-profile',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    TranslatePipe,
    CountUp,
  ],
  templateUrl: './company-profile.html',
  styleUrl: './company-profile.css',
})
export class CompanyProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  private i18n = inject(TranslateService);
  private profileService = inject(ProfileService);
  private analyticsService = inject(AnalyticsService);
  private snackBar = inject(MatSnackBar);

  readonly sizes: CompanySize[] = ['MICRO', 'PEQUENA', 'MEDIANA', 'GRANDE'];

  company = signal<CompanyProfile | null>(null);
  summary = signal<CompanySummaryReport | null>(null);
  loading = signal(true);
  loadError = signal('');
  saving = signal(false);
  saveError = signal('');

  form = this.fb.nonNullable.group({
    legalName: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
    tradeName: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
    industry: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
    companySize: ['MICRO' as CompanySize, Validators.required],
    district: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
  });

  /** Dos letras del nombre comercial para el logo provisional. */
  initials = computed(() => {
    const name = this.company()?.tradeName ?? '';
    return name
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  });

  ngOnInit(): void {
    this.profileService.getMyCompany().subscribe({
      next: (company) => {
        this.setCompany(company);
        this.loading.set(false);
        // Los indicadores son un extra: si fallan, la pantalla sigue funcionando.
        this.analyticsService
          .getCompanySummary(company.id)
          .pipe(catchError(() => of(null)))
          .subscribe((summary) => this.summary.set(summary));
      },
      error: () => {
        this.loadError.set(this.i18n.instant('profiles.company.loadError'));
        this.loading.set(false);
      },
    });
  }

  discard(): void {
    const c = this.company();
    if (c) this.fillForm(c);
    this.saveError.set('');
  }

  save(): void {
    const c = this.company();
    if (!c) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: UpdateCompanyProfileRequest = {
      legalName: v.legalName.trim(),
      tradeName: v.tradeName.trim(),
      industry: v.industry.trim(),
      companySize: v.companySize,
      district: v.district.trim(),
      email: v.email.trim() || null,
    };

    this.saving.set(true);
    this.saveError.set('');
    this.profileService.updateMyCompany(c.id, request).subscribe({
      next: (updated) => {
        this.setCompany(updated);
        this.saving.set(false);
        this.snackBar.open(this.i18n.instant('profiles.company.saved'), undefined, { duration: 3000 });
      },
      error: () => {
        this.saveError.set(this.i18n.instant('profiles.company.saveError'));
        this.saving.set(false);
      },
    });
  }

  private setCompany(company: CompanyProfile): void {
    this.company.set(company);
    this.fillForm(company);
  }

  private fillForm(c: CompanyProfile): void {
    this.form.reset({
      legalName: c.legalName,
      tradeName: c.tradeName,
      industry: c.industry,
      companySize: c.companySize,
      district: c.district,
      email: c.email ?? '',
    });
  }
}

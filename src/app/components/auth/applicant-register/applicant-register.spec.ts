import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ApplicantRegister } from './applicant-register';

describe('ApplicantRegister', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [ApplicantRegister],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    });
    const fixture = TestBed.createComponent(ApplicantRegister);
    fixture.detectChanges();
    return fixture;
  }

  it('limita la fecha de nacimiento a quien ya cumplió 18 años', () => {
    const fixture = create();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="date"]');
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 18);
    expect(input.max.startsWith(String(limit.getFullYear()))).toBe(true);
    expect(fixture.componentInstance.maxBirthDate).toBe(input.max);
  });

  it('muestra y oculta la contraseña con el botón del ojo', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector<HTMLInputElement>('input[formControlName="password"]')!;
    expect(input.type).toBe('password');
    root.querySelector<HTMLButtonElement>('button[aria-label="iam.register.showPassword"]')!.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
  });

  it('muestra el indicador de seguridad cuando se escribe la contraseña', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-password-strength .fuerza')).toBeNull();
    fixture.componentInstance.form.controls.password.setValue('Abcdefgh1!');
    fixture.detectChanges();
    expect(root.querySelector('app-password-strength .fuerza')?.getAttribute('data-nivel')).toBe('strong');
  });
});

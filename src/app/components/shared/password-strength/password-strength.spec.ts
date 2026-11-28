import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PasswordStrength, evaluatePassword } from './password-strength';

describe('evaluatePassword', () => {
  it('marca débil una contraseña corta aunque tenga de todo', () => {
    expect(evaluatePassword('Ab1!').level).toBe('weak');
  });

  it('marca débil una contraseña larga que solo tiene minúsculas', () => {
    const result = evaluatePassword('abcdefghij');
    expect(result.score).toBe(1);
    expect(result.level).toBe('weak');
  });

  it('sube de nivel a medida que cumple reglas', () => {
    expect(evaluatePassword('abcdefgh1').level).toBe('fair');
    expect(evaluatePassword('Abcdefgh1').level).toBe('good');
    expect(evaluatePassword('Abcdefgh1!').level).toBe('strong');
  });

  it('cuenta cuatro reglas', () => {
    expect(evaluatePassword('Abcdefgh1!').score).toBe(4);
    expect(evaluatePassword('').score).toBe(0);
  });
});

describe('PasswordStrength', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PasswordStrength], providers: [provideTranslateService()] });
  });

  it('no muestra nada si no hay contraseña', () => {
    const fixture = TestBed.createComponent(PasswordStrength);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.fuerza')).toBeNull();
  });

  it('muestra 4 barras y marca las que corresponden', () => {
    const fixture = TestBed.createComponent(PasswordStrength);
    fixture.componentRef.setInput('password', 'Abcdefgh1');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.fuerza')?.getAttribute('data-nivel')).toBe('good');
    expect(root.querySelectorAll('.barras span').length).toBe(4);
    expect(root.querySelectorAll('.barras span.activa').length).toBe(3);
    expect(root.querySelectorAll('.reglas li.cumple').length).toBe(3);
  });
});

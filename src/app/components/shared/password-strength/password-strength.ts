import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export type PasswordRuleKey = 'length' | 'caseMix' | 'number' | 'symbol';
export type PasswordLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordRule {
  key: PasswordRuleKey;
  ok: boolean;
}

export interface PasswordEvaluation {
  rules: PasswordRule[];
  score: number; // 0 a 4: cuántas reglas cumple
  level: PasswordLevel;
}

/**
 * Evalúa una contraseña con cuatro reglas simples. Es una función pura
 * (sin Angular) para poder probarla fácil.
 */
export function evaluatePassword(value: string): PasswordEvaluation {
  const rules: PasswordRule[] = [
    { key: 'length', ok: value.length >= 8 },
    { key: 'caseMix', ok: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { key: 'number', ok: /\d/.test(value) },
    { key: 'symbol', ok: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = rules.filter(rule => rule.ok).length;
  // Una contraseña de menos de 8 caracteres nunca pasa de "débil": el backend la rechaza
  const level: PasswordLevel = !rules[0].ok || score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong';
  return { rules, score, level };
}

/**
 * Barra de seguridad de contraseña con la lista de reglas que cumple.
 * Uso: <app-password-strength [password]="valor" />
 */
@Component({
  selector: 'app-password-strength',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './password-strength.html',
  styleUrl: './password-strength.css',
})
export class PasswordStrength {
  readonly password = input('');

  protected readonly evaluation = computed(() => evaluatePassword(this.password()));
  protected readonly segments = [1, 2, 3, 4];
}

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CriterionSuggestion, QuestionSuggestion } from '../models/recruitment.model';

/**
 * Las sugerencias de IA del backend (modo simulado) llegan en español y salen de un catálogo fijo.
 * Aquí se pasan al idioma elegido con ese mismo catálogo (claves recruitment.aiCatalog.*).
 * Lo que no es del catálogo (por ejemplo, texto de Gemini o datos que escribió el reclutador) se deja igual.
 */
const CRITERIA: Record<string, string> = {
  'Pensamiento analítico': 'analyticalThinking',
  'Comunicación efectiva': 'effectiveCommunication',
  'Dominio técnico': 'technicalMastery',
  'Trabajo en equipo': 'teamwork',
  'Orientación al cliente': 'customerFocus',
  'Gestión de proyectos': 'projectManagement',
  'Orientación comercial': 'commercialFocus',
  'Resolución de problemas': 'problemSolving',
  'Adaptabilidad': 'adaptability',
};

const QUESTION_RATIONALES: Record<string, string> = {
  'Pregunta conductual: una experiencia real muestra cómo aplicó la competencia': 'behavioral',
  'Pregunta situacional basada en la descripción del criterio': 'situational',
  'Explora autocrítica y capacidad de aprendizaje sobre la competencia': 'difficulty',
  'Pregunta hipotética: muestra cómo prioriza al aplicar la competencia': 'hypothetical',
  'Explora los criterios de calidad que aplica, a partir de la descripción del criterio': 'quality',
  'Explicar la competencia a otra persona revela cuánto la domina': 'explain',
};

/** Plantillas de pregunta del backend; los grupos capturan el nombre y la descripción del criterio. */
const QUESTION_TEMPLATES: { key: string; pattern: RegExp; params: ('name' | 'description')[] }[] = [
  { key: 'behavioral', pattern: /^Cuéntame una situación concreta en la que hayas puesto en práctica la competencia «(.+)»\. ¿Qué hiciste y cuál fue el resultado\?$/s, params: ['name'] },
  { key: 'situational', pattern: /^Para este puesto, «(.+)» significa: «(.+)»\. Describe paso a paso cómo lo harías ante un caso real\.$/s, params: ['name', 'description'] },
  { key: 'difficulty', pattern: /^¿Cuál ha sido tu mayor dificultad relacionada con «(.+)» y qué hiciste para superarla\?$/s, params: ['name'] },
  { key: 'hypothetical', pattern: /^Imagina que en tu primer mes debes demostrar «(.+)» con poco tiempo y poca información\. ¿Qué harías primero y por qué\?$/s, params: ['name'] },
  { key: 'quality', pattern: /^¿Cómo compruebas que tu trabajo cumple con lo siguiente: «(.+)»\? Da un ejemplo\.$/s, params: ['description'] },
  { key: 'explain', pattern: /^Si tuvieras que explicarle «(.+)» a una persona nueva en el equipo, ¿qué le dirías y con qué ejemplo\?$/s, params: ['name'] },
];

@Injectable({ providedIn: 'root' })
export class AiSuggestionI18nService {
  private i18n = inject(TranslateService);

  /** El backend ya responde en español: solo se traduce si el usuario eligió otro idioma. */
  private get isSpanish(): boolean {
    return (this.i18n.getCurrentLang() ?? 'es-419').startsWith('es');
  }

  criterion(s: CriterionSuggestion): CriterionSuggestion {
    if (this.isSpanish) return s;
    const id = CRITERIA[s.name];
    return {
      ...s,
      name: id ? this.t(`criteria.${id}.name`) : s.name,
      description: id ? this.t(`criteria.${id}.description`) : s.description,
      rationale: this.criterionRationale(s.rationale),
    };
  }

  question(s: QuestionSuggestion): QuestionSuggestion {
    if (this.isSpanish) return s;
    const rationaleId = QUESTION_RATIONALES[s.rationale];
    for (const template of QUESTION_TEMPLATES) {
      const match = template.pattern.exec(s.statement);
      if (!match) continue;
      const params: Record<string, string> = {};
      template.params.forEach((p, i) => (params[p] = this.criterionNameOrSelf(match[i + 1])));
      return {
        ...s,
        statement: this.t(`questions.${template.key}.statement`, params),
        rationale: rationaleId ? this.t(`questions.${rationaleId}.rationale`) : s.rationale,
      };
    }
    return s;
  }

  private criterionRationale(rationale: string): string {
    if (rationale === 'Competencia general recomendada para cualquier puesto') return this.t('rationale.general');
    const match = /^La descripción menciona: (.+)$/.exec(rationale);
    return match ? this.t('rationale.mentions', { words: match[1] }) : rationale;
  }

  /** Si el criterio es uno del catálogo, también se traduce su nombre dentro de la pregunta. */
  private criterionNameOrSelf(value: string): string {
    const id = CRITERIA[value];
    return id ? this.t(`criteria.${id}.name`) : value;
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.i18n.instant(`recruitment.aiCatalog.${key}`, params);
  }
}

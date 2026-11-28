function themeColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

export function getChartPalette() {
  return {
    primary: themeColor('--mat-sys-primary', '#0f766e'),
    accent: themeColor('--mat-sys-tertiary', '#d97706'),
    neutral: themeColor('--mat-sys-outline', '#8a8f98'),
    // Las variables --mat-sys-* pueden venir como light-dark(...), que el canvas no entiende:
    // para textos y líneas se usan las variables propias de la marca.
    grid: themeColor('--st-border', 'rgba(128,128,128,0.25)'),
    text: themeColor('--st-text-secondary', '#5c6779'),
  };
}
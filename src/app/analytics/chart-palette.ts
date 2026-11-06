function themeColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

export function getChartPalette() {
  return {
    primary: themeColor('--mat-sys-primary', '#0f766e'),
    accent: themeColor('--mat-sys-tertiary', '#d97706'),
    neutral: themeColor('--mat-sys-outline', '#8a8f98'),
    grid: themeColor('--mat-sys-outline-variant', 'rgba(128,128,128,0.25)'),
    text: themeColor('--mat-sys-on-surface', '#1f2933'),
  };
}
import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

/**
 * Muestra un número que sube desde 0 hasta su valor en ~0.9 s.
 * Uso: <span [stCountUp]="valor" [decimals]="1"></span>
 * Si la persona pidió menos movimiento, el número aparece de una vez.
 */
@Directive({
  selector: '[stCountUp]',
})
export class CountUp implements OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private frame = 0;

  readonly stCountUp = input<number | null | undefined>(0);
  readonly decimals = input(0);
  readonly duration = input(900);

  constructor() {
    effect(() => this.animate(this.stCountUp() ?? 0, this.decimals(), this.duration()));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private animate(target: number, decimals: number, duration: number): void {
    cancelAnimationFrame(this.frame);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || duration <= 0) {
      this.render(target, decimals);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // sale rápido y frena suave
      this.render(target * eased, decimals);
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number, decimals: number): void {
    this.el.nativeElement.textContent = value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}

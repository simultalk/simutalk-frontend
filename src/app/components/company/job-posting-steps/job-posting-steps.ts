import { TranslatePipe } from '@ngx-translate/core';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pasos para dejar lista una vacante: datos, criterios y guion. */
@Component({
  selector: 'app-job-posting-steps',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './job-posting-steps.html',
  styleUrl: './job-posting-steps.css',
})
export class JobPostingSteps {
  // Paso actual: 1 datos, 2 criterios, 3 guion
  step = input.required<number>();
  // Sin id (vacante nueva) los otros pasos todavía no son enlaces
  jobId = input<number | null>(null);

  steps = [
    { n: 1, label: 'recruitment.steps.data', path: 'edit' },
    { n: 2, label: 'recruitment.steps.criteria', path: 'criteria' },
    { n: 3, label: 'recruitment.steps.script', path: 'script' },
  ];
}

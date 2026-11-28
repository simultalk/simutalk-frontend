import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IntegrityFlag,
  IntegrityFlagType,
  IntegritySeverity,
} from '../../../models/assessment.model';

type FlagKind = 'AI' | 'CV' | 'OTHER';

@Component({
  selector: 'app-integrity-signals',
  imports: [MatChipsModule, MatIconModule, TranslatePipe],
  templateUrl: './integrity-signals.html',
  styleUrl: './integrity-signals.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegritySignalsComponent {
  /** undefined/null = no mostrar nada. [] = evaluación sin señales. */
  flags = input<IntegrityFlag[] | null | undefined>();

  items = computed(() =>
    (this.flags() ?? []).map(f => ({ ...f, kind: this.kindOf(f.flagType) }))
  );

  kindOf(flagType: IntegrityFlagType): FlagKind {
    if (flagType === 'AI_GENERATED_CONTENT') return 'AI';
    if (flagType === 'CV_INCONSISTENCY') return 'CV';
    return 'OTHER';
  }

  icon(kind: FlagKind): string {
    return kind === 'AI' ? 'smart_toy' : kind === 'CV' ? 'description' : 'flag';
  }

  severityIcon(s: IntegritySeverity): string {
    return s === 'HIGH' ? 'error' : s === 'MEDIUM' ? 'warning' : 'info';
  }
}
import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { RankingBadge, RankingEntry } from '../../../models/ranking';

const BADGE_ICONS: Record<RankingBadge, string> = {
  TOP_RANKED: 'emoji_events',
  STRONG_EVIDENCE: 'verified',
  VERIFIED_CERTIFICATIONS: 'workspace_premium',
  MISSING_MANDATORY_CERTIFICATION: 'report',
  INTEGRITY_ALERT: 'gpp_maybe',
};

/** Podio del ranking: los tres primeros con su anillo de puntaje (recibe 2.º, 1.º, 3.º en ese orden). */
@Component({
  selector: 'app-ranking-podium',
  imports: [DecimalPipe, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './ranking-podium.html',
  styleUrl: './ranking-podium.css',
})
export class RankingPodium {
  readonly entries = input<RankingEntry[]>([]);
  /** En modo anónimo se muestra el código del postulante y un ícono en vez de iniciales. */
  readonly anonymous = input(false);
  readonly selected = output<RankingEntry>();

  displayName(e: RankingEntry): string {
    return this.anonymous() ? (e.candidateCode ?? '—') : (e.candidateName ?? e.candidateCode ?? '—');
  }

  initials(e: RankingEntry): string {
    if (this.anonymous() || !e.candidateName) return '';
    return e.candidateName
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  /** Puntaje sobre 10 como porcentaje del anillo. */
  percent(score: number): number {
    return Math.max(0, Math.min(100, score * 10));
  }

  badgeIcon(b: RankingBadge): string {
    return BADGE_ICONS[b] ?? 'label';
  }
}

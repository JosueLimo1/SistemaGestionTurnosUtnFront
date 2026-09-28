import type { News } from '../../../api';

export type NewsStatusLabel = 'PUBLICADA' | 'PROGRAMADA' | 'ELIMINADA';

/** POSTED → PUBLICADA, PENDING → PROGRAMADA, IsActive = false → ELIMINADA. */
export function newsStatus(n: Pick<News, 'isActive' | 'status'>): NewsStatusLabel {
  if (!n.isActive) return 'ELIMINADA';
  return n.status === 'POSTED' ? 'PUBLICADA' : 'PROGRAMADA';
}

export const pad4 = (n: number) => String(n).padStart(4, '0');

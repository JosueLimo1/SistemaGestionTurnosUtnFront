import type { Worker } from '../../../api';

export const roleLabel = (w: Pick<Worker, 'isAdmin'>) => (w.isAdmin ? 'ADMINISTRADOR' : 'WORKER');

/** Código visible "#W001": orden de alta entre todos los workers (presentación, no existe en el backend). */
export function workerCode(w: Worker, all: Worker[]): string {
  const sorted = all.slice().sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.legajo - b.legajo);
  const i = sorted.findIndex((x) => x.id === w.id);
  return i >= 0 ? `#W${String(i + 1).padStart(3, '0')}` : '#W—';
}

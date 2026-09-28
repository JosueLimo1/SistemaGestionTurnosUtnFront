import type { TurnStatus } from '../api';

const pad = (n: number) => String(n).padStart(2, '0');

/** 15/04/2026 */
export function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 16:30 */
export function formatTime(iso: string | Date): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 16/09 */
export function formatDayMonth(iso: string | Date): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Duración en segundos → 03:24 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** yyyy-mm-dd para <input type="date"> y comparaciones por día. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const TURN_STATUS_LABEL: Record<TurnStatus, string> = {
  PENDING: 'PENDIENTE',
  ATTENDED: 'ATENDIDO',
  CANCELLED: 'CANCELADO',
  LOST: 'PERDIDO',
};

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

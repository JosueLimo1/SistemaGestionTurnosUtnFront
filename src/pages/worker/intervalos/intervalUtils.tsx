import type { IntervalView } from '../../../api';
import styles from './Intervalos.module.css';

export const pad3 = (n: number) => String(n).padStart(3, '0');

export const intervalStatus = (i: Pick<IntervalView, 'isActive'>) => (i.isActive ? 'ACTIVO' : 'DESACTIVADO');

export function occupancy(i: Pick<IntervalView, 'occupied' | 'capacity'>) {
  const pct = i.capacity ? Math.min(100, Math.round((i.occupied / i.capacity) * 100)) : 0;
  return { pct, text: `${i.occupied} de ${i.capacity} turnos (${pct}%)` };
}

/** Barra de ocupación: fondo #D9D9D9, progreso #FF4713. */
export function OccupancyBar({ pct, tall }: { pct: number; tall?: boolean }) {
  return (
    <div className={`${styles.bar} ${tall ? styles.barTall : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.barFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function NoteChips({ names, big }: { names: string[]; big?: boolean }) {
  return (
    <span className={styles.chips}>
      {names.map((n) => (
        <span key={n} className={`${styles.noteChip} ${big ? styles.noteChipBig : ''}`}>
          {n}
        </span>
      ))}
    </span>
  );
}

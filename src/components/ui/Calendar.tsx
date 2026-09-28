import type { ReactNode } from 'react';
import chevron from '../../assets/icon-chevron-left.svg';
import { MESES, sameDay } from '../../utils/format';
import styles from './Calendar.module.css';

/*
 * Calendario mensual del Figma (componente "Calendario": celdas de 60 px, radio 4,
 * encabezado con flechas circulares blancas de 48 px). Semana de lunes a domingo.
 */

const WEEK = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface Props {
  month: Date;
  onMonthChange(month: Date): void;
  /** Selección simple. */
  selected?: Date | null;
  /** Selección por rango (filtros "desde – hasta"). */
  range?: DateRange;
  onSelect(day: Date): void;
  isDisabled?(day: Date): boolean;
  /** inline = "Sacar turno"; floating = desplegable de filtros (borde oscuro, fines de semana rosados). */
  variant?: 'inline' | 'floating';
  disabled?: boolean;
  footer?: ReactNode;
  className?: string;
}

function startOfMonthGrid(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // lunes = 0
  return new Date(first.getFullYear(), first.getMonth(), 1 - dow);
}

export function Calendar({
  month,
  onMonthChange,
  selected,
  range,
  onSelect,
  isDisabled,
  variant = 'inline',
  disabled,
  footer,
  className,
}: Props) {
  const gridStart = startOfMonthGrid(month);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const totalCells = Math.ceil(((lastDay.getDate() + ((new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7)) / 7)) * 7;
  const days = Array.from({ length: totalCells }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const start = range?.start ?? null;
  const end = range?.end ?? null;
  const inRange = (d: Date) => !!start && !!end && d > start && d < end;

  return (
    <div className={`${styles.calendar} ${styles[variant]} ${disabled ? styles.isDisabled : ''} ${className ?? ''}`}>
      <div className={styles.header}>
        <div className={styles.month}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            disabled={disabled}
            aria-label="Mes anterior"
          >
            <img src={chevron} alt="" width={24} height={24} />
          </button>
          <p className={styles.monthName} aria-live="polite">
            <strong>{MESES[month.getMonth()]}</strong> <span>{month.getFullYear()}</span>
          </p>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            disabled={disabled}
            aria-label="Mes siguiente"
          >
            <img src={chevron} alt="" width={24} height={24} className={styles.flip} />
          </button>
        </div>
        <div className={styles.separator} />
        <div className={styles.week}>
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className={styles.row} role="row">
          {week.map((d) => {
            const outside = d.getMonth() !== month.getMonth();
            const off = outside || (isDisabled?.(d) ?? false);
            const isSel = (selected && sameDay(d, selected)) || (start && sameDay(d, start)) || (end && sameDay(d, end));
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const cls = [
              styles.day,
              off ? styles.off : '',
              isSel ? styles.selected : '',
              !isSel && inRange(d) ? styles.inRange : '',
              variant === 'floating' && weekend && !outside ? styles.weekend : '',
            ].join(' ');
            return (
              <button
                key={d.toISOString()}
                type="button"
                className={cls}
                disabled={off || disabled}
                aria-pressed={!!isSel}
                aria-label={`${d.getDate()} de ${MESES[d.getMonth()]}`}
                onClick={() => onSelect(d)}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      ))}
      {footer}
    </div>
  );
}

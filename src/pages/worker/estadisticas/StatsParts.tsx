import type { ReactNode } from 'react';
import iconHelp from '../../../assets/icon-circle-help.svg';
import styles from './Estadisticas.module.css';

/* Íconos de las cajas oscuras: círculo blanco de 30 px con trazo #211F21 (vectores del Figma). */
export function StatusIcon({ kind }: { kind: 'check' | 'clock' | 'cancel' | 'minus' }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <circle cx="15" cy="15" r="15" fill="#fff" />
      {kind === 'check' && <path d="M8.5 15.5 L13 20 L21.5 11" fill="none" stroke="#211f21" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === 'clock' && <path d="M15 8.5 V15 L19.5 18.5" fill="none" stroke="#211f21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === 'cancel' && <path d="M10.5 10.5 L19.5 19.5 M19.5 10.5 L10.5 19.5" fill="none" stroke="#211f21" strokeWidth="3" strokeLinecap="round" />}
      {kind === 'minus' && <path d="M9 15 H21" fill="none" stroke="#211f21" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

/** Select de filtros de Estadísticas (componente "Text Input" tipo dropdown con texto de ayuda). */
export function StatsSelect({
  value,
  placeholder,
  options,
  onChange,
  help,
  label,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange(v: string): void;
  help: ReactNode;
  label: string;
}) {
  return (
    <div className={styles.selectField}>
      <div className={styles.selectBox}>
        <select aria-label={label} className={`${styles.select} ${value ? '' : styles.selectEmpty}`} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.selectSuffix} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="#323639" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <p className={styles.selectHelp}>
        <img src={iconHelp} alt="" width={10} height={10} className={styles.helpIcon} />
        <span>{help}</span>
      </p>
    </div>
  );
}

/** Gráfico de barras ("TURNOS POR HORA/DIA/SEMANA/MES"): barras #FC4914, grilla #DBDEE4. */
export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 400;
  const H = 200;
  const left = 30;
  const bottom = 24;
  const top = 26;
  const plotW = W - left - 10;
  const plotH = H - bottom - top;
  const maxVal = Math.max(5, ...data.map((d) => d.value));
  const max = Math.ceil(maxVal / 5) * 5;
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i));
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(41, slot * 0.7);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Gráfico de turnos">
      <rect x={left} y={4} width={14} height={9} rx={2} fill="#fc4914" />
      <text x={left + 20} y={12} className={styles.chartLegend}>
        Turnos
      </text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W - 10} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#54555a' : '#dbdee4'} strokeWidth={1} />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" className={styles.chartAxis}>
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = left + slot * i + slot / 2;
        const h = (d.value / max) * plotH;
        return (
          <g key={d.label}>
            {d.value > 0 && <rect x={cx - barW / 2} y={y(d.value)} width={barW} height={h} rx={Math.min(8, barW / 3)} fill="#fc4914" />}
            {d.value > 0 && (
              <text x={cx} y={y(d.value) - 4} textAnchor="middle" className={styles.chartValue}>
                {d.value}
              </text>
            )}
            <text x={cx} y={H - 8} textAnchor="middle" className={styles.chartAxis}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Fila con barra de progreso (ranking de notas / intervalo). */
export function BarRow({ label, value, pct, onClick, active }: { label: string; value: ReactNode; pct?: number; onClick?(): void; active?: boolean }) {
  const content = (
    <>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowLine}>
        {pct !== undefined ? (
          <span className={styles.rowBar}>
            <span className={styles.rowTrack}>
              <span className={styles.rowFill} style={{ width: `${pct}%` }} />
            </span>
            <span className={styles.rowPct}>{pct}%</span>
          </span>
        ) : (
          <span className={styles.rowBar} />
        )}
        <span className={styles.rowValue}>{value}</span>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className={`${styles.row} ${styles.rowButton} ${active ? styles.rowActive : ''}`} onClick={onClick} aria-pressed={active}>
      {content}
    </button>
  ) : (
    <div className={styles.row}>{content}</div>
  );
}

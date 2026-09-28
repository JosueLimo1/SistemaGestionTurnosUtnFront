import { useEffect, useRef, useState, type ReactNode } from 'react';
import iconCalendar from '../../assets/icon-calendar.png';
import { formatDate } from '../../utils/format';
import { Button } from './Button';
import { Calendar, type DateRange } from './Calendar';
import { Field } from './Form';
import styles from './ListKit.module.css';

/*
 * Piezas compartidas por los listados (Mis turnos, listado de turnos del worker, noticias, notas,
 * intervalos): panel "Filtrar …", campo de rango de fechas con calendario flotante, chip de estado
 * y paginación.
 */

/* ---------- Panel de filtros ---------- */

interface FilterPanelProps {
  title: string;
  count?: string;
  children: ReactNode;
  onClear(): void;
  onApply(): void;
  /** Botón extra a la derecha del título (ej. "PUBLICAR NOTICIA"). */
  action?: ReactNode;
  className?: string;
}

export function FilterPanel({ title, count, children, onClear, onApply, action, className }: FilterPanelProps) {
  return (
    <section className={`${styles.filters} ${className ?? ''}`} aria-label={title}>
      <div className={styles.filtersHead}>
        <h1 className={styles.filtersTitle}>{title}</h1>
        {action}
      </div>
      {children}
      <div className={styles.filterActions}>
        {count !== undefined && <p className={styles.count}>{count}</p>}
        <div className={styles.filterButtons}>
          <Button variant="outline" onClick={onClear}>
            LIMPIAR
          </Button>
          <Button variant="primary" onClick={onApply}>
            APLICAR
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Fila de campos del panel (en escritorio van en una sola fila). */
export function FilterRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.filterRow} ${className ?? ''}`}>{children}</div>;
}

/* ---------- Campo "Fecha (desde – hasta)" con calendario flotante ---------- */

interface DateRangeFieldProps {
  label?: string;
  value: DateRange;
  onChange(v: DateRange): void;
  defaultOpen?: boolean;
  className?: string;
}

export function DateRangeField({ label = 'Fecha (desde – hasta)', value, onChange, defaultOpen, className }: DateRangeFieldProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [draft, setDraft] = useState<DateRange>(value);
  const [month, setMonth] = useState(() => {
    const base = value.start ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(d: Date) {
    if (!draft.start || draft.end) setDraft({ start: d, end: null });
    else if (d < draft.start) setDraft({ start: d, end: draft.start });
    else setDraft({ start: draft.start, end: d });
  }

  const text =
    value.start && value.end
      ? `${formatDate(value.start)} – ${formatDate(value.end)}`
      : value.start
        ? `${formatDate(value.start)} – dd/mm/aaaa`
        : 'dd/mm/aaaa – dd/mm/aaaa';

  return (
    <div ref={ref} className={`${styles.dateField} ${className ?? ''}`}>
      <Field label={label}>
        <button
          type="button"
          className={`${styles.dateInput} ${open ? styles.dateInputOpen : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span className={value.start ? styles.dateValue : styles.datePlaceholder}>{text}</span>
          <img src={iconCalendar} alt="" className={styles.dateIcon} />
        </button>
      </Field>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Elegir rango de fechas">
          <Calendar
            variant="floating"
            month={month}
            onMonthChange={setMonth}
            range={draft}
            onSelect={pick}
            footer={
              <div className={styles.popFooter}>
                <div>
                  <p className={styles.popLabel}>DESDE – HASTA</p>
                  <p className={styles.popValue}>
                    {draft.start ? formatDate(draft.start) : 'dd/mm/aaaa'} – {draft.end ? formatDate(draft.end) : 'dd/mm/aaaa'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  disabled={!draft.start}
                  onClick={() => {
                    onChange({ start: draft.start, end: draft.end ?? draft.start });
                    setOpen(false);
                  }}
                >
                  APLICAR
                </Button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Chip de estado (contorno negro, sin relleno) ---------- */

export function StatusChip({ children, size = 16 }: { children: ReactNode; size?: 14 | 16 }) {
  return <span className={`${styles.chip} ${size === 14 ? styles.chipSm : ''}`}>{children}</span>;
}

/* ---------- Paginación ---------- */

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage(p: number): void;
  onPageSize?(s: number): void;
  sizes?: number[];
  className?: string;
}

function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 6) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, 3, 4, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, onPage, onPageSize, sizes = [6, 12, 24], className }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className={`${styles.pagination} ${className ?? ''}`} aria-label="Paginación">
      <button type="button" className={styles.pageBtn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Anterior
      </button>
      {pageList(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className={styles.pageBtn} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.pageBtn} ${p === page ? styles.pageActive : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={styles.pageBtn} onClick={() => onPage(page + 1)} disabled={page >= pages}>
        Siguiente
      </button>
      {onPageSize && (
        <label className={styles.perPage}>
          <span>Por página:</span>
          <span className={styles.pageSelect}>
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span aria-hidden>▼</span>
          </span>
        </label>
      )}
    </nav>
  );
}

/* ---------- Estado vacío dentro de un listado ---------- */

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {text && <p className={styles.emptyText}>{text}</p>}
      {action}
    </div>
  );
}

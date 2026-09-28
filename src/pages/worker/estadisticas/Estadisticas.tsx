import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import iconNext from '../../../assets/icon-next-page.png';
import iconCalendar from '../../../assets/icon-calendar.png';
import iconExport from '../../../assets/icon-export.png';
import { api, type IntervalView, type Note, type StatsPeriod, type TurnStatus } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { Calendar, type DateRange } from '../../../components/ui/Calendar';
import { Modal, ModalActions, ModalNote } from '../../../components/ui/Modal';
import { useAsync } from '../../../hooks/useAsync';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { toDateKey } from '../../../utils/format';
import { BarChart, BarRow, StatsSelect, StatusIcon } from './StatsParts';
import { exportStats, periodLabel, periodRange, shiftDate } from './statsUtils';
import styles from './Estadisticas.module.css';

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'DAY', label: 'DIA' },
  { value: 'WEEK', label: 'SEMANA' },
  { value: 'MONTH', label: 'MES' },
  { value: 'YEAR', label: 'AÑO' },
  { value: 'CUSTOM', label: 'PERSONALIZADO' },
];

const BOXES: { key: 'attended' | 'pending' | 'cancelled' | 'lost'; status: TurnStatus; label: string; icon: 'check' | 'clock' | 'cancel' | 'minus' }[] = [
  { key: 'attended', status: 'ATTENDED', label: 'ATENDIDOS', icon: 'check' },
  { key: 'pending', status: 'PENDING', label: 'PENDIENTES', icon: 'clock' },
  { key: 'cancelled', status: 'CANCELLED', label: 'CANCELADOS', icon: 'cancel' },
  { key: 'lost', status: 'LOST', label: 'PERDIDOS', icon: 'minus' },
];

/** Estadísticas del worker (CU Reportes y Estadísticas). */
export default function Estadisticas() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const [period, setPeriod] = useState<StatsPeriod>('DAY');
  const [date, setDate] = useState(() => new Date());
  const [custom, setCustom] = useState<DateRange>({ start: null, end: null });
  const [intervalId, setIntervalId] = useState('');
  const [noteId, setNoteId] = useState('');
  const [intervals, setIntervals] = useState<IntervalView[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [draftRange, setDraftRange] = useState<DateRange>({ start: null, end: null });
  const [exportOpen, setExportOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.intervals.list({ pageSize: 500 }).then((r) => setIntervals(r.items));
    api.notes.all().then(setNotes);
  }, []);

  useEffect(() => {
    if (!calOpen) return;
    const onDoc = (e: MouseEvent) => calRef.current && !calRef.current.contains(e.target as Node) && setCalOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [calOpen]);

  const filter = useMemo(
    () => ({
      period,
      date: date.toISOString(),
      dateStart: period === 'CUSTOM' && custom.start ? custom.start.toISOString() : undefined,
      dateEnd: period === 'CUSTOM' && custom.end ? custom.end.toISOString() : undefined,
      noteId: noteId || undefined,
      intervalId: intervalId || undefined,
    }),
    [period, date, custom, noteId, intervalId],
  );
  const stats = useAsync(() => api.stats.get(filter), [filter]);
  const s = stats.data;
  const interval = intervals.find((i) => i.id === intervalId) ?? null;
  const label = periodLabel(period, date, custom);
  const pct = (n: number) => (s && s.total ? Math.round((n / s.total) * 100) : 0);

  function goToList(status?: TurnStatus) {
    const { start, end } = periodRange(period, date, custom);
    const p = new URLSearchParams({ desde: toDateKey(start), hasta: toDateKey(end) });
    if (status) p.set('estado', status);
    if (noteId) p.set('nota', noteId);
    if (intervalId) p.set('intervalo', intervalId);
    navigate(`/worker/turnos/listado?${p.toString()}`);
  }

  function clearFilters() {
    setPeriod('DAY');
    setDate(new Date());
    setCustom({ start: null, end: null });
    setIntervalId('');
    setNoteId('');
  }

  function pickDay(d: Date) {
    if (period === 'CUSTOM') {
      if (!draftRange.start || draftRange.end) setDraftRange({ start: d, end: null });
      else if (d < draftRange.start) setDraftRange({ start: d, end: draftRange.start });
      else setDraftRange({ start: draftRange.start, end: d });
      return;
    }
    setDate(d);
    setCalOpen(false);
  }

  // Extremos del gráfico ("HORA CON MAYOR / MENOR DEMANDA").
  const nonZero = (s?.chart ?? []).filter((c) => c.value > 0);
  const maxB = nonZero.length ? nonZero.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const minB = nonZero.length ? nonZero.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const bucketText = (l: string) => (s?.bucketLabel === 'HORA' ? `${l.padStart(2, '0')}:00` : l);
  const unit = s?.bucketLabel ?? 'HORA';

  const occupied = interval ? interval.occupied : 0;
  const cap = interval?.capacity ?? 0;
  const capPct = (n: number) => (cap ? Math.round((n / cap) * 100) : 0);

  return (
    <main className={styles.main}>
      {/* ---------- Filtros ---------- */}
      <section className={styles.filter} aria-label="Filtros de estadísticas">
        <div className={styles.filterHead}>
          <h1 className={styles.filterTitle}>ESTADISTICAS POR:</h1>
          <button type="button" className={styles.boxBtn} onClick={() => setExportOpen(true)}>
            <img src={iconExport} alt="" width={30} height={30} />
            <span>EXPORTAR</span>
          </button>
        </div>
        <div className={styles.filtersBlock}>
        <div className={styles.periods} role="tablist" aria-label="Período">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              className={`${styles.period} ${period === p.value ? styles.periodActive : ''}`}
              onClick={() => {
                setPeriod(p.value);
                if (p.value === 'CUSTOM') {
                  setDraftRange(custom);
                  setCalOpen(true);
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={styles.selects}>
          <StatsSelect
            label="Intervalo"
            placeholder="Intervalo"
            value={intervalId}
            onChange={setIntervalId}
            options={intervals.map((i) => ({ value: i.id, label: i.name }))}
            help="Filtra los turnos pertenecientes al intervalo seleccionado"
          />
          <StatsSelect
            label="Nota"
            placeholder="Nota"
            value={noteId}
            onChange={setNoteId}
            options={notes.map((n) => ({ value: n.id, label: n.name }))}
            help="Filtra los turnos correspondientes a la nota seleccionada"
          />
        </div>
        </div>
        <div className={styles.filterFoot}>
          <button type="button" className={styles.clearBtn} onClick={clearFilters}>
            LIMPIAR FILTROS
          </button>
          <div className={styles.navWrap} ref={calRef}>
            <div className={`${styles.boxBtn} ${styles.dateNav}`}>
              <button type="button" className={styles.navArrow} onClick={() => setDate(shiftDate(period, date, -1))} disabled={period === 'CUSTOM'} aria-label="Período anterior">
                <img src={iconNext} alt="" className={styles.flip} />
              </button>
              <span className={styles.navLabel}>{label}</span>
              <button type="button" className={styles.navArrow} onClick={() => setDate(shiftDate(period, date, 1))} disabled={period === 'CUSTOM'} aria-label="Período siguiente">
                <img src={iconNext} alt="" />
              </button>
              <button
                type="button"
                className={styles.navArrow}
                onClick={() => {
                  setDraftRange(custom);
                  setCalMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  setCalOpen((o) => !o);
                }}
                aria-label="Elegir fecha"
              >
                <img src={iconCalendar} alt="" />
              </button>
            </div>
            {calOpen && (
              <div className={styles.calPop}>
                <Calendar
                  variant="floating"
                  month={calMonth}
                  onMonthChange={setCalMonth}
                  selected={period === 'CUSTOM' ? null : date}
                  range={period === 'CUSTOM' ? draftRange : undefined}
                  onSelect={pickDay}
                  footer={
                    period === 'CUSTOM' ? (
                      <div className={styles.calFoot}>
                        <Button
                          variant="primary"
                          disabled={!draftRange.start}
                          onClick={() => {
                            setCustom({ start: draftRange.start, end: draftRange.end ?? draftRange.start });
                            setCalOpen(false);
                          }}
                        >
                          APLICAR
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Turnos ---------- */}
      <section className={styles.card} aria-busy={stats.loading}>
        <h2 className={styles.cardTitle}>TURNOS</h2>
        <div className={styles.boxes}>
          <button type="button" className={styles.total} onClick={() => goToList()}>
            <span>TOTAL</span>
            <strong>{s?.total ?? 0}</strong>
          </button>
          <span className={styles.vline} aria-hidden />
          {BOXES.map((b) => (
            <button key={b.key} type="button" className={styles.darkBox} onClick={() => goToList(b.status)} title={`Ver turnos ${b.label.toLowerCase()}`}>
              <StatusIcon kind={b.icon} />
              <span className={styles.darkLabel}>{b.label}</span>
              <span className={styles.darkValue}>{s?.[b.key] ?? 0}</span>
              <span className={styles.darkRule} />
              <span className={styles.darkPct}>{pct(s?.[b.key] ?? 0)}%</span>
            </button>
          ))}
        </div>
        {s && s.total === 0 && <p className={styles.noData}>No hay turnos registrados para esa combinación de período y filtros.</p>}
      </section>

      <div className={styles.kpis}>
        <section className={styles.kpi}>
          <strong>TIEMPO APROXIMADO DE ATENCION:</strong>
          <span>{s?.avgAttentionMinutes ?? 0} MIN</span>
        </section>
        <section className={styles.kpi}>
          <strong>DEMORA ACUMULADA:</strong>
          <span>{s?.accumulatedDelayMinutes ?? 0} MIN</span>
        </section>
        <section className={styles.kpi}>
          <strong>PROMEDIO DE TURNOS POR {unit}:</strong>
          <span>{s?.avgPerBucket ?? 0}</span>
        </section>
      </div>

      <div className={`${styles.bottom} ${interval && desktop ? styles.bottom3 : ''}`}>
        <section className={`${styles.card} ${styles.notesCard}`}>
          <h2 className={styles.cardTitle}>NOTAS</h2>
          {(s?.byNote ?? []).map((n) => (
            <BarRow key={n.noteId} label={n.name} value={n.value} pct={pct(n.value)} active={noteId === n.noteId} onClick={() => setNoteId(noteId === n.noteId ? '' : n.noteId)} />
          ))}
        </section>

        <section className={`${styles.card} ${styles.chartCard}`}>
          <h2 className={styles.cardTitle}>TURNOS POR {unit}</h2>
          <BarChart data={s?.chart ?? []} />
          <p className={styles.extreme}>
            <strong>{unit} CON MAYOR DEMANDA:</strong> {maxB ? `${bucketText(maxB.label)} — ${maxB.value} turnos` : '—'}
          </p>
          <p className={styles.extreme}>
            <strong>{unit} CON MENOR DEMANDA:</strong> {minB ? `${bucketText(minB.label)} — ${minB.value} turnos` : '—'}
          </p>
        </section>

        {interval && (
          <section className={`${styles.card} ${styles.notesCard}`}>
            <h2 className={styles.cardTitle}>INTERVALO</h2>
            <BarRow label="CUPOS TOTALES" value={cap} />
            <BarRow label="CUPOS LIBRES" value={Math.max(0, cap - occupied)} pct={capPct(Math.max(0, cap - occupied))} />
            <BarRow label="CUPOS OCUPADOS" value={occupied} pct={capPct(occupied)} />
            <BarRow label="TURNOS PERDIDOS" value={s?.lost ?? 0} pct={capPct(s?.lost ?? 0)} />
            <BarRow label="TURNOS CANCELADOS" value={s?.cancelled ?? 0} pct={capPct(s?.cancelled ?? 0)} />
          </section>
        )}
      </div>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="EXPORTAR" tone="orange" width={480}>
        <p className={styles.question}>¿En qué formato querés exportar la vista actual?</p>
        <ModalNote>Se exportan los datos del período ({label}) y de los filtros seleccionados.</ModalNote>
        <ModalActions>
          <Button
            variant="outline"
            size="modal"
            disabled={!s}
            onClick={() => {
              if (s) exportStats('PDF', s, filter, { periodText: label, noteName: notes.find((n) => n.id === noteId)?.name, intervalName: interval?.name });
              setExportOpen(false);
            }}
          >
            PDF
          </Button>
          <Button
            variant="primary"
            size="modal"
            disabled={!s}
            onClick={() => {
              if (s) exportStats('EXCEL', s, filter, { periodText: label, noteName: notes.find((n) => n.id === noteId)?.name, intervalName: interval?.name });
              setExportOpen(false);
            }}
          >
            EXCEL
          </Button>
        </ModalActions>
      </Modal>
    </main>
  );
}

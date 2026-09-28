import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type IntervalView, type Note, type TurnStatus } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { type DateRange } from '../../../components/ui/Calendar';
import { Input, Select } from '../../../components/ui/Form';
import { DateRangeField, EmptyState, FilterPanel, FilterRow, Pagination, StatusChip } from '../../../components/ui/ListKit';
import { useAsync } from '../../../hooks/useAsync';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatDate, formatTime, fromDateKey, toDateKey, TURN_STATUS_LABEL } from '../../../utils/format';
import styles from './ListadoTurnos.module.css';

interface Filters {
  status: '' | TurnStatus;
  noteId: string;
  legajo: string;
  intervalId: string;
  range: DateRange;
}
const EMPTY: Filters = { status: '', noteId: '', legajo: '', intervalId: '', range: { start: null, end: null } };
const STATUS_OPTIONS = (Object.keys(TURN_STATUS_LABEL) as TurnStatus[]).map((s) => ({ value: s, label: TURN_STATUS_LABEL[s] }));

/** Filtros iniciales desde la URL (ej. desde Estadísticas: ?estado=PENDING&desde=2026-09-01&hasta=2026-09-30). */
function fromParams(p: URLSearchParams): Filters {
  const desde = p.get('desde');
  const hasta = p.get('hasta');
  return {
    status: (p.get('estado') as TurnStatus) || '',
    noteId: p.get('nota') ?? '',
    legajo: p.get('legajo') ?? '',
    intervalId: p.get('intervalo') ?? '',
    range: { start: desde ? fromDateKey(desde) : null, end: hasta ? fromDateKey(hasta) : desde ? fromDateKey(desde) : null },
  };
}

/** Listado de turnos del worker (T4 / T4b / T6 — CU Obtener Turnos). */
export default function ListadoTurnos() {
  const desktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const initial = useMemo(() => fromParams(params), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [notes, setNotes] = useState<Note[]>([]);
  const [intervals, setIntervals] = useState<IntervalView[]>([]);

  useEffect(() => {
    api.notes.all().then(setNotes);
    api.intervals.list({ pageSize: 500 }).then((r) => setIntervals(r.items));
  }, []);

  const query = useMemo(
    () => ({
      status: applied.status || undefined,
      noteId: applied.noteId || undefined,
      intervalId: applied.intervalId || undefined,
      search: applied.legajo ? Number(applied.legajo) : undefined,
      dateStart: applied.range.start?.toISOString(),
      dateEnd: applied.range.end?.toISOString(),
      pageNumber: page,
      pageSize,
    }),
    [applied, page, pageSize],
  );
  const list = useAsync(() => api.turns.list(query), [query]);

  function apply(f: Filters = draft) {
    setApplied(f);
    setPage(1);
    const next = new URLSearchParams();
    if (f.status) next.set('estado', f.status);
    if (f.noteId) next.set('nota', f.noteId);
    if (f.legajo) next.set('legajo', f.legajo);
    if (f.intervalId) next.set('intervalo', f.intervalId);
    if (f.range.start) next.set('desde', toDateKey(f.range.start));
    if (f.range.end) next.set('hasta', toDateKey(f.range.end));
    setParams(next, { replace: true });
  }
  function clear() {
    setDraft(EMPTY);
    apply(EMPTY);
  }

  const total = list.data?.total ?? 0;
  const items = list.data?.items ?? [];

  const fStatus = (
    <Select label="Estado del turno" placeholder="Todos" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters['status'] })} options={STATUS_OPTIONS} />
  );
  const fNote = (
    <Select label="Nota" placeholder="Todas" value={draft.noteId} onChange={(e) => setDraft({ ...draft, noteId: e.target.value })} options={notes.map((n) => ({ value: n.id, label: n.name }))} />
  );
  const fLegajo = (
    <Input
      label="Legajo del alumno"
      placeholder="Ej: 58000"
      inputMode="numeric"
      value={draft.legajo}
      onChange={(e) => setDraft({ ...draft, legajo: e.target.value.replace(/\D/g, '') })}
      onKeyDown={(e) => e.key === 'Enter' && apply()}
    />
  );
  const fInterval = (
    <Select
      label="Intervalo"
      placeholder="Todos"
      value={draft.intervalId}
      onChange={(e) => setDraft({ ...draft, intervalId: e.target.value })}
      options={intervals.map((i) => ({ value: i.id, label: i.name }))}
    />
  );
  const fDate = (
    <DateRangeField
      value={draft.range}
      onChange={(range) => {
        const next = { ...draft, range };
        setDraft(next);
        apply(next);
      }}
    />
  );

  return (
    <main className={styles.main}>
      <FilterPanel
        title="Filtrar Turnos"
        count={list.loading && !list.data ? 'Buscando…' : `${total} ${total === 1 ? 'turno encontrado' : 'turnos encontrados'}`}
        onClear={clear}
        onApply={() => apply()}
      >
        {desktop ? (
          <FilterRow>
            {fStatus}
            {fNote}
            {fLegajo}
            {fInterval}
            {fDate}
          </FilterRow>
        ) : (
          <>
            <FilterRow>
              {fStatus}
              {fNote}
            </FilterRow>
            <FilterRow>
              {fLegajo}
              {fInterval}
            </FilterRow>
            {fDate}
          </>
        )}
      </FilterPanel>

      {!list.loading && items.length === 0 ? (
        <EmptyState
          title="NO SE ENCONTRARON TURNOS"
          text="No hay turnos que coincidan con los filtros seleccionados. Probá modificarlos o limpiarlos."
          action={
            <Button variant="outline" onClick={clear}>
              LIMPIAR FILTROS
            </Button>
          }
        />
      ) : (
        <div className={styles.results} aria-busy={list.loading}>
          {items.map((t) => (
            <article key={t.id} className={styles.card}>
              <div className={styles.dateRow}>
                <span>{formatDate(t.date)}</span>
                <span>{formatTime(t.date)}</span>
              </div>
              <p className={styles.note}>{t.note.name}</p>
              <p className={styles.dato}>
                <strong>ALUMNO:</strong> {t.student.name} · {t.student.legajo}
              </p>
              <p className={styles.dato}>
                <strong>INTERVALO:</strong> {t.interval.name}
              </p>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Estado:</span>
                <StatusChip>{TURN_STATUS_LABEL[t.status]}</StatusChip>
              </div>
              <Link to={`/worker/turnos/${t.id}`} className={styles.detail}>
                VER DETALLE
              </Link>
            </article>
          ))}
        </div>
      )}

      {total > 0 && (
        <Pagination
          className={styles.pagination}
          page={page}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
          onPageSize={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      )}
    </main>
  );
}

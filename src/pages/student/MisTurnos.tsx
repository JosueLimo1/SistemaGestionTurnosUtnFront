import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Note, type TurnStatus, type TurnView } from '../../api';
import { useStudent } from '../../auth/SessionContext';
import { Button } from '../../components/ui/Button';
import { type DateRange } from '../../components/ui/Calendar';
import { Select } from '../../components/ui/Form';
import { DateRangeField, EmptyState, FilterPanel, FilterRow, Pagination, StatusChip } from '../../components/ui/ListKit';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { descargarComprobante } from '../../utils/comprobante';
import { formatDate, formatTime, TURN_STATUS_LABEL } from '../../utils/format';
import { CancelTurnModal } from './CancelTurnModal';
import styles from './MisTurnos.module.css';

interface Filters {
  range: DateRange;
  status: '' | TurnStatus;
  noteId: string;
}
const EMPTY: Filters = { range: { start: null, end: null }, status: '', noteId: '' };

const STATUS_OPTIONS = (Object.keys(TURN_STATUS_LABEL) as TurnStatus[]).map((s) => ({ value: s, label: TURN_STATUS_LABEL[s] }));

/** Faltan menos de 3 días: el turno ya no se puede cancelar (Regla 02). */
const tooLate = (t: TurnView) => new Date(t.date).getTime() - Date.now() < 3 * 86400000;

/** "Mis turnos" del alumno (CU Obtener Turnos + Cancelar turno). */
export default function MisTurnos() {
  const student = useStudent();
  const desktop = useIsDesktop();
  const toast = useToast();
  const [params] = useSearchParams();
  const highlight = params.get('turno');

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [notes, setNotes] = useState<Note[]>([]);
  const [cancelling, setCancelling] = useState<TurnView | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    api.notes.all().then(setNotes);
  }, []);

  const query = useMemo(
    () => ({
      studentId: student.id,
      status: applied.status || undefined,
      noteId: applied.noteId || undefined,
      dateStart: applied.range.start?.toISOString(),
      dateEnd: applied.range.end?.toISOString(),
      pageNumber: page,
      pageSize,
      sort: 'upcoming' as const,
    }),
    [student.id, applied, page, pageSize],
  );
  const list = useAsync(() => api.turns.list(query), [query]);

  useEffect(() => {
    if (highlight && highlightRef.current) highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, list.data]);

  const apply = (f: Filters = draft) => {
    setApplied(f);
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    apply(EMPTY);
  };

  const total = list.data?.total ?? 0;
  const items = list.data?.items ?? [];

  const dateField = (
    <DateRangeField
      value={draft.range}
      defaultOpen={params.get('calendario') === '1'}
      onChange={(range) => {
        const next = { ...draft, range };
        setDraft(next);
        apply(next);
      }}
    />
  );
  const statusField = (
    <Select
      label="Estado del turno"
      placeholder="Todos"
      value={draft.status}
      onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters['status'] })}
      options={STATUS_OPTIONS}
    />
  );
  const noteField = (
    <Select
      label="Nota"
      placeholder="Todas"
      value={draft.noteId}
      onChange={(e) => setDraft({ ...draft, noteId: e.target.value })}
      options={notes.map((n) => ({ value: n.id, label: n.name }))}
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
            {dateField}
            {statusField}
            {noteField}
          </FilterRow>
        ) : (
          <>
            {dateField}
            <FilterRow>
              {statusField}
              {noteField}
            </FilterRow>
          </>
        )}
      </FilterPanel>

      {list.error && <p className={styles.error}>{list.error}</p>}

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
          {items.map((t) => {
            const cancellable = t.status === 'PENDING' && !tooLate(t);
            return (
              <article
                key={t.id}
                ref={t.id === highlight ? (el) => { highlightRef.current = el; } : undefined}
                className={`${styles.card} ${t.id === highlight ? styles.highlight : ''}`}
              >
                <div className={styles.dateRow}>
                  <span>{formatDate(t.date)}</span>
                  <span>{formatTime(t.date)}</span>
                </div>
                <p className={styles.note}>{t.note.name}</p>
                <p className={styles.dato}>
                  <strong>INTERVALO:</strong> <span>{t.interval.name}</span>
                </p>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Estado:</span>
                  <StatusChip>{TURN_STATUS_LABEL[t.status]}</StatusChip>
                  {t.status === 'PENDING' && tooLate(t) && <span className={styles.statusNote}>No se puede cancelar: faltan menos de 3 días</span>}
                </div>
                <div className={styles.buttons}>
                  <Button variant="primary" onClick={() => descargarComprobante(t)}>
                    DESCARGAR PDF
                  </Button>
                  <Button variant="danger" disabled={!cancellable} onClick={() => setCancelling(t)}>
                    CANCELAR TURNO
                  </Button>
                </div>
              </article>
            );
          })}
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

      <CancelTurnModal
        turn={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={(t) => {
          setCancelling(null);
          toast('TURNO CANCELADO', { detail: `${t.note.name} · ${formatDate(t.date)} ${formatTime(t.date)}`, tone: 'red' });
          list.reload();
        }}
      />
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type IntervalView, type Note, type Worker } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { type DateRange } from '../../../components/ui/Calendar';
import { Select } from '../../../components/ui/Form';
import { DateRangeField, EmptyState, FilterPanel, FilterRow, Pagination, StatusChip } from '../../../components/ui/ListKit';
import { useAsync } from '../../../hooks/useAsync';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatDate } from '../../../utils/format';
import { DeactivateModal } from './DeactivateModal';
import { intervalStatus, NoteChips, occupancy, OccupancyBar, pad3 } from './intervalUtils';
import styles from './Intervalos.module.css';

interface Filters {
  range: DateRange;
  noteId: string;
  workerId: string;
}
const EMPTY: Filters = { range: { start: null, end: null }, noteId: '', workerId: '' };

/** Listado de intervalos (I1 / I1b — CU Gestión de Intervalos 1.d). */
export default function Intervalos() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [notes, setNotes] = useState<Note[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [deactivating, setDeactivating] = useState<IntervalView | null>(null);

  useEffect(() => {
    api.notes.all().then(setNotes);
    api.workers.all().then(setWorkers);
  }, []);

  const query = useMemo(
    () => ({
      dateStart: applied.range.start?.toISOString(),
      dateEnd: applied.range.end?.toISOString(),
      noteId: applied.noteId || undefined,
      workerId: applied.workerId || undefined,
      pageNumber: page,
      pageSize,
    }),
    [applied, page, pageSize],
  );
  const list = useAsync(() => api.intervals.list(query), [query]);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const apply = (f: Filters = draft) => {
    setApplied(f);
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    apply(EMPTY);
  };

  const fDate = (
    <DateRangeField
      label="Vigencia (desde – hasta)"
      value={draft.range}
      onChange={(range) => {
        const next = { ...draft, range };
        setDraft(next);
        apply(next);
      }}
    />
  );
  const fNote = <Select label="Nota asociada" placeholder="Todas" value={draft.noteId} onChange={(e) => setDraft({ ...draft, noteId: e.target.value })} options={notes.map((n) => ({ value: n.id, label: n.name }))} />;
  const fWorker = <Select label="Creado por" placeholder="Todos" value={draft.workerId} onChange={(e) => setDraft({ ...draft, workerId: e.target.value })} options={workers.map((w) => ({ value: w.id, label: w.name }))} />;

  return (
    <main className={styles.main}>
      <FilterPanel
        title="Filtrar Intervalos"
        count={list.loading && !list.data ? 'Buscando…' : `${total} ${total === 1 ? 'intervalo encontrado' : 'intervalos encontrados'}`}
        onClear={clear}
        onApply={() => apply()}
      >
        {desktop ? (
          <FilterRow>
            {fDate}
            {fNote}
            {fWorker}
          </FilterRow>
        ) : (
          <>
            {fDate}
            <FilterRow>
              {fNote}
              {fWorker}
            </FilterRow>
          </>
        )}
      </FilterPanel>

      {!list.loading && items.length === 0 ? (
        <EmptyState
          title="NO SE ENCONTRARON INTERVALOS"
          text="No hay intervalos que coincidan con los filtros aplicados. Probá con otras fechas o limpiá los filtros."
          action={
            <Button variant="outline" onClick={clear}>
              LIMPIAR FILTROS
            </Button>
          }
        />
      ) : (
        <div className={styles.results} aria-busy={list.loading}>
          {items.map((i) => {
            const occ = occupancy(i);
            return (
              <article key={i.id} className={styles.card}>
                <div className={styles.dateRow}>
                  <span>
                    {formatDate(i.dateStart)} – {formatDate(i.dateEnd)}
                  </span>
                  <span className={styles.num}>#{pad3(i.number)}</span>
                </div>
                <p className={styles.name}>{i.name}</p>
                <p className={styles.dato}>
                  <strong>CREADO POR:</strong> {i.createdBy?.name ?? '—'}
                </p>
                <div className={styles.notesRow}>
                  <strong>NOTAS:</strong>
                  <NoteChips names={i.notes.map((n) => n.name)} />
                </div>
                <div className={styles.occ}>
                  <p className={styles.dato}>
                    <strong>OCUPACIÓN:</strong> {occ.text}
                  </p>
                  <OccupancyBar pct={occ.pct} />
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Estado:</span>
                  <StatusChip>{intervalStatus(i)}</StatusChip>
                </div>
                <div className={styles.cardButtons}>
                  <Button variant="primary" onClick={() => navigate(`/worker/intervalos/${i.id}`)}>
                    VER DETALLE
                  </Button>
                  <Button variant="outline" disabled={!i.isActive} onClick={() => navigate(`/worker/intervalos/${i.id}/editar`)}>
                    EDITAR
                  </Button>
                  <Button variant="danger" disabled={!i.isActive} onClick={() => setDeactivating(i)}>
                    DESACTIVAR
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

      <DeactivateModal interval={deactivating} onClose={() => setDeactivating(null)} onDone={() => list.reload()} />
    </main>
  );
}

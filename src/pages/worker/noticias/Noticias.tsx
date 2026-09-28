import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type NewsView, type Worker } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Form';
import { EmptyState, FilterPanel, FilterRow, Pagination, StatusChip } from '../../../components/ui/ListKit';
import { useToast } from '../../../components/ui/Toast';
import { useAsync } from '../../../hooks/useAsync';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatDate, formatTime } from '../../../utils/format';
import { DeleteNewsModal } from './DeleteNewsModal';
import { newsStatus } from './newsUtils';
import styles from './Noticias.module.css';

type StatusFilter = '' | 'POSTED' | 'PENDING' | 'DELETED';
interface Filters {
  title: string;
  status: StatusFilter;
  workerId: string;
}
const EMPTY: Filters = { title: '', status: '', workerId: '' };
const STATUS_OPTIONS = [
  { value: 'POSTED', label: 'PUBLICADA' },
  { value: 'PENDING', label: 'PROGRAMADA' },
  { value: 'DELETED', label: 'ELIMINADA' },
];

/** Listado de noticias del worker (N1 / N1b — CU Gestión de Noticias 1.d). */
export default function NoticiasWorker() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const toast = useToast();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [deleting, setDeleting] = useState<NewsView | null>(null);

  useEffect(() => {
    api.workers.all().then(setWorkers);
  }, []);

  const query = useMemo(
    () => ({ search: applied.title || undefined, status: applied.status || undefined, workerId: applied.workerId || undefined, pageNumber: page, pageSize }),
    [applied, page, pageSize],
  );
  const list = useAsync(() => api.news.list(query), [query]);
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

  const fTitle = (
    <Input
      label="Titulo de la noticia"
      placeholder="Ej: Ampliación de cupo 2do cuatrimestre 2026"
      value={draft.title}
      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      onKeyDown={(e) => e.key === 'Enter' && apply()}
    />
  );
  const fStatus = (
    <Select label="Estado de la noticia" placeholder="Todos" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as StatusFilter })} options={STATUS_OPTIONS} />
  );
  const fAuthor = (
    <Select label="Autor de la noticia" placeholder="Todos" value={draft.workerId} onChange={(e) => setDraft({ ...draft, workerId: e.target.value })} options={workers.map((w) => ({ value: w.id, label: w.name }))} />
  );

  return (
    <main className={styles.main}>
      <FilterPanel
        title="Filtrar Noticias"
        count={list.loading && !list.data ? 'Buscando…' : `${total} ${total === 1 ? 'noticia encontrada' : 'noticias encontradas'}`}
        onClear={clear}
        onApply={() => apply()}
      >
        {desktop ? (
          <FilterRow>
            {fTitle}
            {fStatus}
            {fAuthor}
          </FilterRow>
        ) : (
          <>
            {fTitle}
            <FilterRow>
              {fStatus}
              {fAuthor}
            </FilterRow>
          </>
        )}
      </FilterPanel>

      {!list.loading && items.length === 0 ? (
        <EmptyState
          title="NO SE ENCONTRARON NOTICIAS"
          text="No hay noticias que coincidan con los filtros aplicados. Probá cambiarlos o limpiarlos."
          action={
            <Button variant="outline" onClick={clear}>
              LIMPIAR FILTROS
            </Button>
          }
        />
      ) : (
        <div className={styles.results} aria-busy={list.loading}>
          {items.map((n) => {
            const st = newsStatus(n);
            const deleted = st === 'ELIMINADA';
            return (
              <article key={n.id} className={styles.card}>
                <div className={styles.dateRow}>
                  <span>{formatDate(n.datePost)}</span>
                  <span>{formatTime(n.datePost)}</span>
                </div>
                <p className={styles.title}>{n.title.toUpperCase()}</p>
                <p className={styles.dato}>
                  <strong>AUTOR:</strong> {n.author?.name ?? '—'}
                </p>
                <p className={`${styles.dato} ${styles.clamp}`}>
                  <strong>DETALLE:</strong> {n.description}
                </p>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Estado:</span>
                  <StatusChip>{st}</StatusChip>
                </div>
                <div className={styles.cardButtons}>
                  <Button variant="primary" onClick={() => navigate(`/worker/noticias/${n.id}`)}>
                    VER DETALLE
                  </Button>
                  <Button variant="outline" disabled={deleted} onClick={() => navigate(`/worker/noticias/${n.id}/editar`)}>
                    EDITAR
                  </Button>
                  <Button variant="danger" disabled={deleted} onClick={() => setDeleting(n)}>
                    ELIMINAR
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

      <DeleteNewsModal
        news={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(n) => {
          setDeleting(null);
          toast('NOTICIA ELIMINADA', { detail: n.title, tone: 'red' });
          list.reload();
        }}
      />
    </main>
  );
}

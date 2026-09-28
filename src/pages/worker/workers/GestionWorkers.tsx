import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, errorMessage, type Worker } from '../../../api';
import { useSession, useWorker } from '../../../auth/SessionContext';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Form';
import { EmptyState, FilterPanel, FilterRow, Pagination, StatusChip } from '../../../components/ui/ListKit';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useAsync } from '../../../hooks/useAsync';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { formatDate } from '../../../utils/format';
import { roleLabel, workerCode } from './workerUtils';
import styles from './GestionWorkers.module.css';

interface Filters {
  search: string;
  role: '' | 'ADMIN' | 'WORKER';
}
const EMPTY: Filters = { search: '', role: '' };

type Action = { kind: 'grant' | 'revoke' | 'delete'; worker: Worker } | { kind: 'lastAdmin'; worker: Worker };

/**
 * Gestión de Worker (W1 / W1b / W4 / W5 / W5b / W6).
 * CU "Gestión de Worker": solo un Worker con rol Administrador registra y elimina workers
 * y extiende o desasocia el rol Administrador (Reglas 07 y 12).
 */
export default function GestionWorkers() {
  const me = useWorker();
  const { refresh } = useSession();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const toast = useToast();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [all, setAll] = useState<Worker[]>([]);
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({ search: applied.search || undefined, role: applied.role || undefined, pageNumber: page, pageSize }),
    [applied, page, pageSize],
  );
  const list = useAsync(() => api.workers.list(query), [query]);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  // Todos los workers: numeración #W001… por fecha de alta y cantidad de administradores (Regla 12).
  const loadAll = () => api.workers.all().then(setAll);
  useEffect(() => {
    loadAll();
  }, []);
  const admins = all.filter((w) => w.isAdmin).length;

  const apply = (f: Filters = draft) => {
    setApplied(f);
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    apply(EMPTY);
  };

  function open(kind: 'grant' | 'revoke' | 'delete', worker: Worker) {
    setError(null);
    // Regla 12: el último Administrador no puede perder el rol ni ser eliminado.
    if ((kind === 'revoke' || kind === 'delete') && worker.isAdmin && admins <= 1) return setAction({ kind: 'lastAdmin', worker });
    setAction({ kind, worker });
  }

  async function confirm() {
    if (!action || action.kind === 'lastAdmin') return;
    const { kind, worker } = action;
    setSaving(true);
    setError(null);
    try {
      if (kind === 'delete') {
        await api.workers.remove(worker.id, me.id);
        toast('WORKER ELIMINADO', { detail: worker.name });
      } else {
        await api.workers.setAdmin(worker.id, kind === 'grant', me.id);
        toast(kind === 'grant' ? 'ROL DE ADMINISTRADOR OTORGADO' : 'ROL DE ADMINISTRADOR QUITADO', { detail: worker.name });
      }
      setAction(null);
      list.reload();
      loadAll();
      if (worker.id === me.id && kind === 'revoke') {
        // Se quitó el rol a sí mismo: ya no puede ver esta pantalla.
        await refresh();
        navigate('/worker', { replace: true });
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LAST_ADMIN') setAction({ kind: 'lastAdmin', worker });
      else setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const fSearch = (
    <Input
      label="Nombre, apellido o legajo"
      placeholder="Ej: Gomez o 1003"
      value={draft.search}
      onChange={(e) => setDraft({ ...draft, search: e.target.value })}
      onKeyDown={(e) => e.key === 'Enter' && apply()}
    />
  );
  const fRole = (
    <Select
      label="Rol"
      placeholder="Todos"
      value={draft.role}
      onChange={(e) => {
        const next = { ...draft, role: e.target.value as Filters['role'] };
        setDraft(next);
        apply(next);
      }}
      options={[
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'WORKER', label: 'Worker' },
      ]}
    />
  );

  const w = action?.worker;

  return (
    <main className={styles.main}>
      <div className={styles.topBar}>
        <Button variant="primary" className={styles.newBtn} onClick={() => navigate('/worker/workers/nuevo')}>
          + REGISTRAR NUEVO WORKER
        </Button>
      </div>

      <FilterPanel
        title="Filtrar Workers"
        count={list.loading && !list.data ? 'Buscando…' : `${total} ${total === 1 ? 'worker encontrado' : 'workers encontrados'}`}
        onClear={clear}
        onApply={() => apply()}
      >
        {desktop ? (
          <FilterRow>
            {fSearch}
            {fRole}
          </FilterRow>
        ) : (
          <>
            {fSearch}
            {fRole}
          </>
        )}
      </FilterPanel>

      {!list.loading && items.length === 0 ? (
        <EmptyState
          title="NO SE ENCONTRARON WORKERS"
          text="No hay workers que coincidan con los filtros aplicados. Probá con otro nombre o limpiá los filtros."
          action={
            <Button variant="outline" onClick={clear}>
              LIMPIAR FILTROS
            </Button>
          }
        />
      ) : (
        <div className={styles.results} aria-busy={list.loading}>
          {items.map((x) => {
            const self = x.id === me.id;
            return (
              <article key={x.id} className={styles.card}>
                <div className={styles.head}>
                  <p className={styles.name}>{x.name}</p>
                  <span className={styles.code}>{workerCode(x, all)}</span>
                </div>
                <p className={styles.dato}>
                  <strong>EMAIL:</strong> {x.email}
                </p>
                <p className={styles.dato}>
                  <strong>LEGAJO:</strong> {x.legajo}
                </p>
                <p className={styles.dato}>
                  <strong>ALTA:</strong> {x.createdAt ? formatDate(x.createdAt) : '—'}
                </p>
                <div className={styles.roleRow}>
                  <span className={styles.roleLabel}>Rol:</span>
                  <StatusChip>{roleLabel(x)}</StatusChip>
                  {self && <span className={styles.self}>Sesión actual</span>}
                </div>
                <div className={styles.cardButtons}>
                  <Button variant="outline" onClick={() => open(x.isAdmin ? 'revoke' : 'grant', x)}>
                    {x.isAdmin ? 'QUITAR ROL ADMIN' : 'DAR ROL ADMIN'}
                  </Button>
                  <Button variant="danger" disabled={self} title={self ? 'No podés eliminar tu propio usuario' : undefined} onClick={() => open('delete', x)}>
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

      {/* W4 — Dar rol de administrador */}
      <Modal open={action?.kind === 'grant'} onClose={() => !saving && setAction(null)} title="DAR ROL DE ADMINISTRADOR" tone="orange">
        {w && (
          <>
            <p className={styles.question}>¿Querés darle el rol de Administrador a este worker?</p>
            <ModalSummary
              rows={[
                ['Worker', `${workerCode(w, all)} · ${w.name}`],
                ['Email', w.email],
                ['Rol actual', roleLabel(w)],
              ]}
            />
            {error ? <p className={styles.modalError}>{error}</p> : <ModalNote>Va a poder registrar y eliminar workers, y dar o quitar el rol de Administrador.</ModalNote>}
            <ModalActions>
              <Button variant="outline" size="modal" onClick={() => setAction(null)} disabled={saving}>
                VOLVER
              </Button>
              <Button variant="primary" size="modal" onClick={confirm} disabled={saving}>
                CONFIRMAR
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      {/* W5 — Quitar rol de administrador */}
      <Modal open={action?.kind === 'revoke'} onClose={() => !saving && setAction(null)} title="QUITAR ROL DE ADMINISTRADOR" tone="red">
        {w && (
          <>
            <p className={styles.question}>¿Querés quitarle el rol de Administrador a este worker?</p>
            <ModalSummary
              rows={[
                ['Worker', `${workerCode(w, all)} · ${w.name}`],
                ['Email', w.email],
                ['Rol actual', roleLabel(w)],
              ]}
            />
            {error ? (
              <p className={styles.modalError}>{error}</p>
            ) : (
              <ModalNote>
                {w.id === me.id
                  ? 'Te estás quitando el rol a vos mismo: vas a dejar de ver Gestión de Workers.'
                  : 'Va a seguir siendo worker, pero ya no va a poder gestionar workers ni roles.'}
              </ModalNote>
            )}
            <ModalActions>
              <Button variant="primary" size="modal" onClick={() => setAction(null)} disabled={saving}>
                VOLVER
              </Button>
              <Button variant="danger" size="modal" onClick={confirm} disabled={saving}>
                QUITAR ROL
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      {/* W5b — Último administrador (Regla 12) */}
      <Modal open={action?.kind === 'lastAdmin'} onClose={() => setAction(null)} title="NO SE PUEDE QUITAR EL ROL" tone="red">
        {w && (
          <>
            <p className={styles.question}>Este worker es el único Administrador del sistema.</p>
            <ModalSummary
              rows={[
                ['Worker', `${workerCode(w, all)} · ${w.name}`],
                ['Administradores', String(admins)],
              ]}
            />
            <ModalNote>Siempre tiene que haber al menos un Administrador. Primero dale el rol a otro worker y después quitáselo a este.</ModalNote>
            <ModalActions>
              <Button variant="primary" size="modal" onClick={() => setAction(null)}>
                ENTENDIDO
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      {/* W6 — Eliminar worker */}
      <Modal open={action?.kind === 'delete'} onClose={() => !saving && setAction(null)} title="ELIMINAR WORKER" tone="red">
        {w && (
          <>
            <p className={styles.question}>¿Estás seguro de que querés eliminar este worker?</p>
            <ModalSummary
              rows={[
                ['Worker', `${workerCode(w, all)} · ${w.name}`],
                ['Email', w.email],
                ['Rol', roleLabel(w)],
              ]}
            />
            {error ? (
              <p className={styles.modalError}>{error}</p>
            ) : (
              <ModalNote>Esta acción no se puede deshacer. El worker ya no va a poder ingresar al sistema.</ModalNote>
            )}
            <ModalActions>
              <Button variant="primary" size="modal" onClick={() => setAction(null)} disabled={saving}>
                VOLVER
              </Button>
              <Button variant="danger" size="modal" onClick={confirm} disabled={saving}>
                CONFIRMAR ELIMINACIÓN
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </main>
  );
}

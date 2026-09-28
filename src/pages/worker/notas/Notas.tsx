import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage, type Note } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Form';
import { EmptyState, Pagination } from '../../../components/ui/ListKit';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useAsync } from '../../../hooks/useAsync';
import styles from './Notas.module.css';

const pad3 = (n: number) => String(n).padStart(3, '0');

/** "Buscar notas" + editar/eliminar (CU Gestión de Notas — sección de Victor). */
export default function Notas() {
  const toast = useToast();
  const [draft, setDraft] = useState({ id: '', name: '' });
  const [applied, setApplied] = useState({ id: '', name: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ id: applied.id || undefined, search: applied.name || undefined, pageNumber: page, pageSize }), [applied, page, pageSize]);
  const list = useAsync(() => api.notes.list(query), [query]);

  useEffect(() => {
    api.notes.all().then((n) => setAllNotes(n.slice().sort((a, b) => a.number - b.number)));
  }, [list.data]);

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  function openEdit(n: Note) {
    setModalError(null);
    setEditName(n.name);
    setEditing(n);
  }
  function openDelete(n: Note) {
    setModalError(null);
    setDeleting(n);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setModalError(null);
    try {
      const n = await api.notes.update(editing.id, { name: editName });
      setEditing(null);
      toast('NOTA ACTUALIZADA', { detail: n.name });
      list.reload();
    } catch (e) {
      setModalError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    setModalError(null);
    try {
      await api.notes.remove(deleting.id);
      toast('NOTA ELIMINADA', { detail: deleting.name, tone: 'red' });
      setDeleting(null);
      list.reload();
    } catch (e) {
      setModalError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.main}>
      <section className={styles.filter} aria-label="Buscar notas">
        <div className={styles.filterInner}>
          <h1 className={styles.filterTitle}>Buscar Notas</h1>
          <Select
            label="ID"
            placeholder="Todos"
            value={draft.id}
            onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            options={allNotes.map((n) => ({ value: n.id, label: pad3(n.number) }))}
          />
          <Input
            label="Nombre Nota"
            placeholder="Ej: Ampliación de cupo"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setApplied(draft);
                setPage(1);
              }
            }}
          />
          <div className={styles.actions}>
            <p className={styles.count}>{list.loading && !list.data ? 'Buscando…' : `${total} ${total === 1 ? 'nota encontrada' : 'notas encontradas'}`}</p>
            <div className={styles.buttons}>
              <Button
                variant="outline"
                onClick={() => {
                  const empty = { id: '', name: '' };
                  setDraft(empty);
                  setApplied(empty);
                  setPage(1);
                }}
              >
                LIMPIAR
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setApplied(draft);
                  setPage(1);
                }}
              >
                APLICAR
              </Button>
            </div>
          </div>
        </div>
      </section>

      {!list.loading && items.length === 0 ? (
        <EmptyState title="NO SE ENCONTRARON NOTAS" text="Probá con otro nombre o limpiá los filtros." />
      ) : (
        <div className={styles.grid} aria-busy={list.loading}>
          {items.map((n) => (
            <article key={n.id} className={styles.card}>
              <div className={styles.cardHead}>
                <p className={styles.id}>ID: {pad3(n.number)}</p>
                <p className={styles.name}>{n.name}</p>
              </div>
              <hr className={styles.rule} />
              <div className={styles.cardButtons}>
                <button type="button" className={`${styles.big} ${styles.edit}`} onClick={() => openEdit(n)}>
                  EDITAR
                </button>
                <button type="button" className={`${styles.big} ${styles.del}`} onClick={() => openDelete(n)}>
                  ELIMINAR
                </button>
              </div>
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

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title="EDITAR NOTA" tone="orange">
        <div className={styles.modalField}>
          <Input label="Nombre Nota" placeholder="Ej: Ampliación de cupo" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus error={modalError} />
        </div>
        <ModalNote>La nota tomará este nuevo nombre y el sistema lo mostrará en turnos e intervalos.</ModalNote>
        <ModalActions>
          <Button variant="primary" size="modal" onClick={() => setEditing(null)} disabled={saving}>
            VOLVER
          </Button>
          <Button variant="danger" size="modal" onClick={saveEdit} disabled={saving || !editName.trim()}>
            CONFIRMAR CAMBIO
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={!!deleting} onClose={() => !saving && setDeleting(null)} title="CONFIRMAR ELIMINACION" tone="red">
        {deleting && (
          <ModalSummary
            rows={[
              ['NOMBRE', deleting.name],
              ['ID', pad3(deleting.number)],
            ]}
          />
        )}
        {modalError ? (
          <p className={styles.modalError} role="alert">
            {modalError}
          </p>
        ) : (
          <ModalNote>La nota se eliminará y dejará de estar disponible para nuevos turnos e intervalos.</ModalNote>
        )}
        <ModalActions>
          <Button variant="primary" size="modal" onClick={() => setDeleting(null)} disabled={saving}>
            VOLVER
          </Button>
          <Button variant="danger" size="modal" onClick={confirmDelete} disabled={saving || !!modalError}>
            CONFIRMAR ELIMINACION
          </Button>
        </ModalActions>
      </Modal>
    </main>
  );
}

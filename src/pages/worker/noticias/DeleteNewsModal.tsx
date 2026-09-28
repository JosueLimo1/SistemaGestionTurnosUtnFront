import { useState } from 'react';
import { api, errorMessage, type NewsView } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions, ModalNote, ModalSummary } from '../../../components/ui/Modal';
import { formatDate, formatTime } from '../../../utils/format';
import { newsStatus } from './newsUtils';
import styles from './Noticias.module.css';

/** Modal "ELIMINAR NOTICIA" (N5): baja lógica, la noticia queda ELIMINADA. */
export function DeleteNewsModal({ news, onClose, onDeleted }: { news: NewsView | null; onClose(): void; onDeleted(n: NewsView): void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!news) return;
    setSaving(true);
    setError(null);
    try {
      await api.news.remove(news.id);
      onDeleted(news);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!news} onClose={() => !saving && onClose()} title="ELIMINAR NOTICIA" tone="red">
      {news && (
        <>
          <p className={styles.question}>¿Querés eliminar esta noticia?</p>
          <ModalSummary
            rows={[
              ['Título', news.title.toUpperCase()],
              ['Autor', news.author?.name ?? '—'],
              [newsStatus(news) === 'PROGRAMADA' ? 'Se publica' : 'Publicada', `${formatDate(news.datePost)} - ${formatTime(news.datePost)}`],
              ['Estado', newsStatus(news)],
            ]}
          />
          {error ? <p className={styles.modalError}>{error}</p> : <ModalNote>La noticia dejará de mostrarse a los alumnos y quedará con estado ELIMINADA en el listado.</ModalNote>}
          <ModalActions>
            <Button variant="primary" size="modal" onClick={onClose} disabled={saving}>
              VOLVER
            </Button>
            <Button variant="danger" size="modal" onClick={confirm} disabled={saving}>
              CONFIRMAR ELIMINACIÓN
            </Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}

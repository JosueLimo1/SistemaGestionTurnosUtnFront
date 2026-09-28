import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { EmptyState, StatusChip } from '../../../components/ui/ListKit';
import { useToast } from '../../../components/ui/Toast';
import { useAsync } from '../../../hooks/useAsync';
import { formatDate, formatTime } from '../../../utils/format';
import d from '../turnos/DetalleTurno.module.css';
import { DeleteNewsModal } from './DeleteNewsModal';
import { newsStatus } from './newsUtils';
import styles from './NoticiaDetalleWorker.module.css';

/** Detalle de noticia del worker (N6). */
export default function NoticiaDetalleWorker() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const news = useAsync(() => api.news.get(id), [id]);
  const [deleting, setDeleting] = useState(false);

  if (news.error) {
    return (
      <main className={d.main}>
        <EmptyState title="NOTICIA NO ENCONTRADA" text={news.error} />
      </main>
    );
  }
  const n = news.data;
  const st = n ? newsStatus(n) : 'PUBLICADA';
  const modified = n && new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime() > 60000;
  const steps = n
    ? [
        { label: 'CREADA', date: n.createdAt },
        { label: 'MODIFICADA', date: modified ? n.updatedAt : null, muted: !modified },
        { label: st, date: st === 'ELIMINADA' ? n.updatedAt : n.datePost, accent: true },
      ]
    : [];

  return (
    <main className={d.main}>
      <button type="button" className={d.back} onClick={() => navigate('/worker/noticias')}>
        ← VOLVER AL LISTADO
      </button>
      {!n ? (
        <p className={d.loading}>Cargando noticia…</p>
      ) : (
        <div className={d.layout}>
          <div className={d.colLeft}>
            <section className={d.hero}>
              <div className={d.heroHead}>
                <h1 className={d.heroTitle}>DETALLE DE LA NOTICIA</h1>
                <StatusChip>{st}</StatusChip>
              </div>
              <p className={d.heroDate}>
                {st === 'PROGRAMADA' ? 'Se publica el' : 'Publicada el'} {formatDate(n.datePost)}
              </p>
              <p className={d.heroHour}>{formatTime(n.datePost)}</p>
              <p className={d.heroNote}>{n.title.toUpperCase()}</p>
              <hr className={d.rule} />
              <p className={styles.body}>{n.description}</p>
            </section>
          </div>
          <div className={d.colRight}>
            <section className={`${d.side} ${d.dataCard}`}>
              <h2 className={d.cardTitle}>DATOS DE LA NOTICIA</h2>
              <dl className={d.rows}>
                <div className={d.row}>
                  <dt>AUTOR</dt>
                  <dd>{n.author?.name ?? '—'}</dd>
                </div>
                <div className={d.row}>
                  <dt>VISIBLE PARA</dt>
                  <dd>TODOS LOS ALUMNOS</dd>
                </div>
                <div className={d.row}>
                  <dt>ÚLTIMA MODIFICACIÓN</dt>
                  <dd>
                    {formatDate(n.updatedAt)} {formatTime(n.updatedAt)} · {n.author?.name ?? '—'}
                  </dd>
                </div>
              </dl>
            </section>
            <div className={styles.actions}>
              <Button variant="outline" size="modal" disabled={st === 'ELIMINADA'} onClick={() => navigate(`/worker/noticias/${n.id}/editar`)}>
                EDITAR
              </Button>
              <Button variant="danger" size="modal" disabled={st === 'ELIMINADA'} onClick={() => setDeleting(true)}>
                ELIMINAR
              </Button>
            </div>
          </div>
          <div className={d.colFull}>
            <section className={d.timelineCard}>
              <h2 className={d.cardTitle}>RECORRIDO DE LA NOTICIA</h2>
              <ol className={d.steps}>
                {steps.map((s, i) => (
                  <li key={s.label} className={d.step}>
                    <span className={d.track}>
                      <span className={`${d.line} ${i === 0 ? d.hidden : ''}`} />
                      <span className={`${d.dot} ${s.accent ? d.dotAccent : ''} ${s.muted ? d.dotMuted : ''}`} />
                      <span className={`${d.line} ${i === steps.length - 1 ? d.hidden : ''}`} />
                    </span>
                    <span className={d.stepLabel}>{s.label}</span>
                    <span className={d.stepDate}>
                      {s.date ? (
                        <>
                          {formatDate(s.date)}
                          <br />
                          {formatTime(s.date)}
                        </>
                      ) : (
                        'Sin cambios'
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}

      <DeleteNewsModal
        news={deleting ? n : null}
        onClose={() => setDeleting(false)}
        onDeleted={(x) => {
          setDeleting(false);
          toast('NOTICIA ELIMINADA', { detail: x.title, tone: 'red' });
          news.reload();
        }}
      />
    </main>
  );
}

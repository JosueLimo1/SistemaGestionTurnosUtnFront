import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Button } from '../../../components/ui/Button';
import { EmptyState, StatusChip } from '../../../components/ui/ListKit';
import { useAsync } from '../../../hooks/useAsync';
import { formatDate, formatDayMonth, formatTime } from '../../../utils/format';
import d from '../turnos/DetalleTurno.module.css';
import { DeactivateModal } from './DeactivateModal';
import { intervalStatus, NoteChips, occupancy, OccupancyBar, pad3 } from './intervalUtils';
import styles from './IntervaloDetalle.module.css';

/** Detalle del intervalo (I6). */
export default function IntervaloDetalle() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const interval = useAsync(() => api.intervals.get(id), [id]);
  const [deactivating, setDeactivating] = useState(false);

  if (interval.error) {
    return (
      <main className={d.main}>
        <EmptyState title="INTERVALO NO ENCONTRADO" text={interval.error} />
      </main>
    );
  }
  const i = interval.data;
  const occ = i ? occupancy(i) : { pct: 0, text: '' };

  return (
    <main className={d.main}>
      <button type="button" className={d.back} onClick={() => navigate('/worker/intervalos')}>
        ← VOLVER AL LISTADO
      </button>
      {!i ? (
        <p className={d.loading}>Cargando intervalo…</p>
      ) : (
        <div className={d.layout}>
          <div className={d.colLeft}>
            <section className={d.hero}>
              <div className={d.heroHead}>
                <h1 className={d.heroTitle}>DETALLE DEL INTERVALO</h1>
                <StatusChip>{intervalStatus(i)}</StatusChip>
              </div>
              <p className={d.heroDate}>
                Intervalo #{pad3(i.number)} · Vigencia {new Date(i.dateStart).getFullYear()}
              </p>
              <p className={d.heroHour}>
                {formatDayMonth(i.dateStart)} – {formatDayMonth(i.dateEnd)}
              </p>
              <p className={d.heroNote}>{i.name}</p>
              <hr className={d.rule} />
              <p className={styles.body}>{i.description || 'Sin descripción.'}</p>
            </section>
            <section className={`${d.side} ${styles.occCard}`}>
              <h2 className={d.cardTitle}>OCUPACIÓN</h2>
              <p className={styles.occText}>
                {i.occupied} de {i.capacity} turnos asignados ({occ.pct}%)
              </p>
              <OccupancyBar pct={occ.pct} tall />
              <div className={d.metrics}>
                <div className={d.metric}>
                  <p className={d.metricLabel}>TURNOS ASIGNADOS</p>
                  <p className={d.metricValue}>{i.occupied}</p>
                </div>
                <div className={d.metric}>
                  <p className={d.metricLabel}>PENDIENTES</p>
                  <p className={d.metricValue}>{i.pendingCount}</p>
                </div>
                <div className={d.metric}>
                  <p className={d.metricLabel}>DISPONIBLES</p>
                  <p className={d.metricValue}>{Math.max(0, i.capacity - i.occupied)}</p>
                </div>
              </div>
            </section>
          </div>
          <div className={d.colRight}>
            <section className={d.side}>
              <h2 className={d.cardTitle}>NOTAS ASOCIADAS</h2>
              <NoteChips names={i.notes.map((n) => n.name)} big />
            </section>
            <section className={`${d.side} ${d.dataCard}`}>
              <h2 className={d.cardTitle}>DATOS DEL INTERVALO</h2>
              <dl className={d.rows}>
                <div className={d.row}>
                  <dt>CREADO POR</dt>
                  <dd>{i.createdBy?.name ?? '—'}</dd>
                </div>
                <div className={d.row}>
                  <dt>CREADO EL</dt>
                  <dd>
                    {formatDate(i.createdAt)} {formatTime(i.createdAt)}
                  </dd>
                </div>
                <div className={d.row}>
                  <dt>ÚLTIMA MODIFICACIÓN</dt>
                  <dd>
                    {formatDate(i.updatedAt)} {formatTime(i.updatedAt)} · {i.createdBy?.name ?? '—'}
                  </dd>
                </div>
                {!i.isActive && (
                  <div className={d.row}>
                    <dt>MOTIVO DE DESACTIVACIÓN</dt>
                    <dd>{i.explainDesactivation || '—'}</dd>
                  </div>
                )}
              </dl>
            </section>
            <div className={styles.actions}>
              <Button variant="outline" size="modal" disabled={!i.isActive} onClick={() => navigate(`/worker/intervalos/${i.id}/editar`)}>
                EDITAR
              </Button>
              <Button variant="danger" size="modal" disabled={!i.isActive} onClick={() => setDeactivating(true)}>
                DESACTIVAR
              </Button>
            </div>
          </div>
        </div>
      )}
      <DeactivateModal interval={deactivating ? i : null} onClose={() => setDeactivating(false)} onDone={() => interval.reload()} />
    </main>
  );
}

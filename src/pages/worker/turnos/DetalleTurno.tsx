import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';
import { EmptyState, StatusChip } from '../../../components/ui/ListKit';
import { useAsync } from '../../../hooks/useAsync';
import { formatClock, formatDate, formatTime, TURN_STATUS_LABEL } from '../../../utils/format';
import styles from './DetalleTurno.module.css';

function initials(name: string): string {
  const [apellido = '', nombre = ''] = name.split(',').map((s) => s.trim());
  return `${apellido[0] ?? ''}${nombre[0] ?? ''}`.toUpperCase();
}

/** Detalle de turno del worker (T5). */
export default function DetalleTurno() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const turn = useAsync(() => api.turns.get(id), [id]);
  const stats = useAsync(
    () => (turn.data ? api.stats.get({ period: 'DAY', date: turn.data.date }) : Promise.resolve(null)),
    [turn.data?.date],
  );

  if (turn.error) {
    return (
      <main className={styles.main}>
        <EmptyState title="TURNO NO ENCONTRADO" text={turn.error} />
      </main>
    );
  }
  const t = turn.data;

  const finalLabel = t ? (t.status === 'PENDING' ? 'PENDIENTE' : TURN_STATUS_LABEL[t.status]) : '';
  const finalDate = t ? (t.status === 'ATTENDED' && t.dateAttended ? t.dateAttended : t.status === 'PENDING' ? null : t.date) : null;
  const steps: { label: string; date: string | null; accent?: boolean; muted?: boolean }[] = t
    ? [
        { label: 'SOLICITADO', date: t.createdAt },
        { label: 'ASIGNADO', date: t.date },
        { label: finalLabel, date: finalDate, accent: t.status !== 'PENDING', muted: t.status === 'PENDING' },
      ]
    : [];

  const back = (
    <button type="button" className={styles.back} onClick={() => navigate('/worker/turnos/listado')}>
      ← VOLVER AL LISTADO
    </button>
  );

  const hero = t && (
    <section className={styles.hero}>
      <div className={styles.heroHead}>
        <h1 className={styles.heroTitle}>DETALLE DEL TURNO</h1>
        <StatusChip>{TURN_STATUS_LABEL[t.status]}</StatusChip>
      </div>
      <p className={styles.heroDate}>{formatDate(t.date)}</p>
      <p className={styles.heroHour}>{formatTime(t.date)}</p>
      <p className={styles.heroNote}>{t.note.name}</p>
      <hr className={styles.rule} />
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>ATENDIDO A LAS</p>
          <p className={styles.metricValue}>{t.dateAttended ? formatTime(t.dateAttended) : '—'}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>TIEMPO DE ATENCIÓN</p>
          <p className={styles.metricValue}>{t.attentionSeconds ? formatClock(t.attentionSeconds) : '—'}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>PROMEDIO DEL DÍA</p>
          <p className={styles.metricValue}>{stats.data?.avgAttentionMinutes ? `${stats.data.avgAttentionMinutes} MIN` : '—'}</p>
        </div>
      </div>
    </section>
  );

  const timeline = t && (
    <section className={styles.timelineCard}>
      <h2 className={styles.cardTitle}>RECORRIDO DEL TURNO</h2>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={s.label + i} className={styles.step}>
            <span className={styles.track}>
              <span className={`${styles.line} ${i === 0 ? styles.hidden : ''}`} />
              <span className={`${styles.dot} ${s.accent ? styles.dotAccent : ''} ${s.muted ? styles.dotMuted : ''}`} />
              <span className={`${styles.line} ${i === steps.length - 1 ? styles.hidden : ''}`} />
            </span>
            <span className={styles.stepLabel}>{s.label}</span>
            <span className={styles.stepDate}>
              {s.date ? (
                <>
                  {formatDate(s.date)}
                  <br />
                  {formatTime(s.date)}
                </>
              ) : (
                '—'
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );

  const student = t && (
    <section className={styles.side}>
      <h2 className={styles.cardTitle}>ALUMNO</h2>
      <div className={styles.person}>
        <span className={styles.avatar} aria-hidden>
          {initials(t.student.name)}
        </span>
        <div className={styles.personData}>
          <p className={styles.personName}>{t.student.name}</p>
          <p className={styles.personMeta}>Legajo {t.student.legajo}</p>
          <p className={styles.personMeta}>{t.student.institutionalEmail}</p>
        </div>
      </div>
    </section>
  );

  const data = t && (
    <section className={`${styles.side} ${styles.dataCard}`}>
      <h2 className={styles.cardTitle}>DATOS DEL TURNO</h2>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>INTERVALO</dt>
          <dd>{t.interval.name}</dd>
        </div>
        <div className={styles.row}>
          <dt>VIGENCIA</dt>
          <dd>
            {formatDate(t.interval.dateStart)} – {formatDate(t.interval.dateEnd)}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>{t.status === 'LOST' ? 'MARCADO POR' : 'ATENDIDO POR'}</dt>
          <dd>{t.attendedBy?.name ?? '—'}</dd>
        </div>
      </dl>
    </section>
  );

  return (
    <main className={styles.main}>
      {back}
      {!t ? (
        <p className={styles.loading}>Cargando turno…</p>
      ) : (
        <div className={styles.layout}>
          <div className={styles.colLeft}>{hero}</div>
          <div className={styles.colRight}>
            {student}
            {data}
          </div>
          <div className={styles.colFull}>{timeline}</div>
        </div>
      )}
    </main>
  );
}
